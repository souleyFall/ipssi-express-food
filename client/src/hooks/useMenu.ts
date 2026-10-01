import { useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import type { DailyMenu } from '../lib/types';

export function useMenu() {
  const [menu, setMenu] = useState<DailyMenu | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<DailyMenu>('/menu/du-jour')
      .then(setMenu)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  return { menu, error };
}
