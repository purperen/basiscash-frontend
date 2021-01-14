import { useCallback, useEffect, useState } from 'react';
import useBasisCash from './useBasisCash';
import config from '../config';

const useBondOracleBlockTimestampLast = () => {
  const [timestamp, setTimestamp] = useState<number>(Number);
  const basisCash = useBasisCash();

  const fetchBlockTimestampLast= useCallback(async () => {
    setTimestamp(await basisCash.getBondOracleBlockTimestampLast());
  }, [basisCash]);

  useEffect(() => {
    fetchBlockTimestampLast().catch((err) => console.error(`Failed to fetch Block Timestamp Last: ${err.stack}`));
    const refreshInterval = setInterval(fetchBlockTimestampLast, config.refreshInterval);
    return () => clearInterval(refreshInterval);
  }, [setTimestamp, basisCash]);

  return timestamp;
};

export default useBondOracleBlockTimestampLast;
