import { useState, useCallback, useRef, useEffect } from 'react';

export function useClipboard(timeout = 2000) {
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setCopiedValue(text);
      timeoutRef.current = setTimeout(() => setCopiedValue(null), timeout);
    });
  }, [timeout]);

  return { copiedValue, copy };
}
