export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const unauthorized = (message = 'Authentification requise') => new HttpError(401, message);
export const forbidden = (message = 'Accès refusé') => new HttpError(403, message);
export const notFound = (message = 'Ressource introuvable') => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);
