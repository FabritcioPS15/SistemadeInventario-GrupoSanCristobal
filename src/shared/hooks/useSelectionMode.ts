import { useCallback, useState } from 'react';

export function useSelectionMode(initialSelectionMode = false) {
  const [selectionMode, setSelectionMode] = useState(initialSelectionMode);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => !prev);
  }, []);

  const enableSelectionMode = useCallback(() => {
    setSelectionMode(true);
  }, []);

  const disableSelectionMode = useCallback(() => {
    setSelectionMode(false);
  }, []);

  return { selectionMode, toggleSelectionMode, enableSelectionMode, disableSelectionMode, setSelectionMode };
}
