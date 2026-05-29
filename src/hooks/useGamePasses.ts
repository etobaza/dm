import { useState, useCallback } from 'react';
import { fetchGamePasses } from '../api/roblox';
import type { GamePass, FetchStatus } from '../types';
import { getErrorMessage } from '../utils';

export function useGamePasses() {
  const [gamePasses, setGamePasses] = useState<GamePass[]>([]);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchPasses = useCallback(async (universeId: string) => {
    setStatus('loading');
    setError(null);
    setGamePasses([]);

    try {
      const data = await fetchGamePasses(universeId);
      setGamePasses(data.gamePasses);
      setStatus('success');
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus('error');
    }
  }, []);

  return {
    gamePasses,
    status,
    error,
    fetchPasses,
  };
}
