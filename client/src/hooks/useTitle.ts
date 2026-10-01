import { useEffect } from 'react';

export function useTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · IPSSI Express Food`;
  }, [title]);
}
