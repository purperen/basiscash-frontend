import React, { useCallback, useMemo } from 'react';
import { Route, Switch, useRouteMatch } from 'react-router-dom';
import { useWallet } from 'use-wallet';

import Button from '../../components/Button';
import Page from '../../components/Page';
import PageHeader from '../../components/PageHeader';
import ExchangeCard from './components/ExchangeCard';
import styled from 'styled-components';
import Spacer from '../../components/Spacer';
import useBondStats from '../../hooks/useBondStats';
import useBasisCash from '../../hooks/useBasisCash';
import useBondOraclePriceInLastTWAP from '../../hooks/useBondOraclePriceInLastTWAP';
import useBondOracleBlockTimestampLast from '../../hooks/useBondOracleBlockTimestampLast';
import { useTransactionAdder } from '../../state/transactions/hooks';
import config from '../../config';
import LaunchCountdown from '../../components/LaunchCountdown';
import ExchangeStat from './components/ExchangeStat';
import RefreshStat from './components/RefreshStat';
import useTokenBalance from '../../hooks/useTokenBalance';
import { getDisplayBalance } from '../../utils/formatBalance';
import { getDisplayDate } from '../../utils/formatDate';
import { BigNumber } from 'ethers';

const Bond: React.FC = () => {
  const { path } = useRouteMatch();
  const { account, connect } = useWallet();
  const basisCash = useBasisCash();
  const addTransaction = useTransactionAdder();
  const bondStat = useBondStats();
  const cashPrice = useBondOraclePriceInLastTWAP();
  const blockTimestampLast = useBondOracleBlockTimestampLast();

  const bondBalance = useTokenBalance(basisCash?.BAB);

  const handleBuyBonds = useCallback(
    async (amount: string) => {
      const tx = await basisCash.buyBonds(amount);
      const bondAmount = Number(amount) / Number(getDisplayBalance(cashPrice));
      addTransaction(tx, {
        summary: `Buy ${bondAmount.toFixed(2)} MIB with ${amount} MIC`,
      });
    },
    [basisCash, addTransaction, cashPrice],
  );

  const handleRedeemBonds = useCallback(
    async (amount: string) => {
      const tx = await basisCash.redeemBonds(amount);
      addTransaction(tx, { summary: `Redeem ${amount} BAB` });
    },
    [basisCash, addTransaction],
  );

  const handleBondOracleBlockTimestampLast = useCallback(
    async () => {
      const tx = await basisCash.updateBondOracle();
      addTransaction(tx, { summary: `Update Bond Oracle BlockTimestampLast` });
    },
    [basisCash, addTransaction],
  );

  const cashIsOverpriced = useMemo(() => cashPrice.gt(BigNumber.from(10).pow(18)), [cashPrice]);
  const cashIsUnderPriced = useMemo(() => Number(bondStat?.priceInUSDT) < 1.0, [bondStat]);

  const refreshIsDisable = false;
  const isLaunched = Date.now() >= config.bondLaunchesAt.getTime();
  if (!isLaunched) {
    return (
      <Switch>
        <Page>
          <PageHeader
            title="Buy & Redeem Bonds"
            subtitle="Earn premiums upon redemption"
          />
          <LaunchCountdown
            deadline={config.bondLaunchesAt}
            description="How does MITH bond work?"
            descriptionLink="https://docs.basis.cash/mechanisms/stabilization-mechanism" // todo: change link
          />
        </Page>
      </Switch>
    );
  }
  return (
    <Switch>
      <Page>
        {!!account ? (
          <>
            <Route exact path={path}>
              <PageHeader
                title="Buy & Redeem Bonds"
                subtitle="Earn premiums upon redemption"
              />
            </Route>
            <StyledBond>
              <StyledCardWrapper>
                <ExchangeCard
                  action="Purchase"
                  fromToken={basisCash.BAC}
                  fromTokenName="MITH Cash"
                  toToken={basisCash.BAB}
                  toTokenName="MITH Bond"
                  priceDesc={
                    cashIsOverpriced
                      ? 'MIC is over $1'
                      : cashIsUnderPriced
                        ? `${Math.floor(
                          100 / Number(bondStat.priceInUSDT) - 100,
                        )}% return when MIC > $1`
                        : '-'
                  }
                  onExchange={handleBuyBonds}
                  disabled={!bondStat || cashIsOverpriced}
                />
              </StyledCardWrapper>
              <StyledStatsWrapper>
                <RefreshStat
                  tokenName="MIC"
                  description="Last-Hour TWAP Price"
                  price={getDisplayBalance(cashPrice, 18, 2)}
                  lastUpdatedTime={`Last Updated Time : ${getDisplayDate(blockTimestampLast)}`}
                  onRefresh={handleBondOracleBlockTimestampLast}
                  disabled={!blockTimestampLast || Date.now()/1000 - blockTimestampLast < 300}
                />
                <Spacer size="md" />
                <ExchangeStat
                  tokenName="MIB"
                  description="Current Price: (MIC)^2"
                  price={bondStat?.priceInUSDT || '-'}
                />
              </StyledStatsWrapper>
              <StyledCardWrapper>
                <ExchangeCard
                  action="Redeem"
                  fromToken={basisCash.BAB}
                  fromTokenName="MITH Bond"
                  toToken={basisCash.BAC}
                  toTokenName="MITH Cash"
                  priceDesc={`${getDisplayBalance(bondBalance)} MIB Available`}
                  onExchange={handleRedeemBonds}
                  disabled={!bondStat || bondBalance.eq(0) || cashIsUnderPriced}
                />
              </StyledCardWrapper>
            </StyledBond>
          </>
        ) : (
            <div
              style={{
                alignItems: 'center',
                display: 'flex',
                flex: 1,
                justifyContent: 'center',
              }}
            >
              <Button onClick={() => connect('injected')} text="Unlock Wallet" />
            </div>
          )}
      </Page>
    </Switch>
  );
};

const StyledBond = styled.div`
  display: flex;
  width: 900px;
  @media (max-width: 768px) {
    width: 100%;
    flex-flow: column nowrap;
    align-items: center;
  }
`;

const StyledCardWrapper = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  @media (max-width: 768px) {
    width: 80%;
  }
`;

const StyledStatsWrapper = styled.div`
  display: flex;
  flex: 0.8;
  margin: 0 20px;
  flex-direction: column;

  @media (max-width: 768px) {
    width: 80%;
    margin: 16px 0;
  }
`;

export default Bond;
