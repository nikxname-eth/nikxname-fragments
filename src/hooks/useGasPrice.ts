import { useEffect, useState } from 'react';

export function useGasPrice(delayMs = 4_000, intervalMs = 30_000) {
  const [gwei, setGwei] = useState<number | null>(null);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const fetchGas = async () => {
      try {
        const response = await fetch('https://cloudflare-eth.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_gasPrice', params: [], id: 1 }),
        });
        const data = await response.json();
        if (data.result) setGwei(Math.round(parseInt(data.result, 16) / 1e9));
      } catch {
        /* optional */
      }
    };

    const start = () => {
      void fetchGas();
      intervalId = setInterval(fetchGas, intervalMs);
    };

    const delayId = window.setTimeout(start, delayMs);
    return () => {
      window.clearTimeout(delayId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [delayMs, intervalMs]);

  return gwei;
}