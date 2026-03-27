/**
 * useDebugMode
 *
 * Returns true when `?debug=true` is present in the URL.
 * Works reactively — if the user adds/removes the param the hook updates.
 */
import { useEffect, useState } from 'react';

export function useDebugMode(): boolean {
  const [active, setActive] = useState(() =>
    new URLSearchParams(window.location.search).get('debug') === 'true',
  );

  useEffect(() => {
    const check = () =>
      setActive(new URLSearchParams(window.location.search).get('debug') === 'true');

    window.addEventListener('popstate', check);
    return () => window.removeEventListener('popstate', check);
  }, []);

  return active;
}
