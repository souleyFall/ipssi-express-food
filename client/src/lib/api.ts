export interface FieldError {
  champ: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details: FieldError[] = [],
  ) {
    super(message);
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Appel à l'API Express. La session voyage dans un cookie httpOnly (jamais dans le JS). */
export async function api<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? 'Le serveur ne répond pas, réessayez', data?.details);
  }
  return data as T;
}

/** Message lisible pour l'utilisateur, avec le détail du premier champ invalide. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.details.length ? err.details[0].message : err.message;
  }
  return 'Une erreur inattendue est survenue';
}
