import type { CookieOptions, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config, isProduction } from '../config.js';
import { forbidden, unauthorized } from '../lib/http-error.js';

export type Role = 'client' | 'livreur' | 'admin';

export interface AuthUser {
  id: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const SESSION_COOKIE = 'ef_session';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: isProduction,
  path: '/',
};

export function openSession(res: Response, user: AuthUser): void {
  const maxAgeSeconds = Math.round(config.SESSION_HOURS * 3600);
  const token = jwt.sign({ role: user.role }, config.JWT_SECRET, {
    subject: user.id,
    expiresIn: maxAgeSeconds,
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: maxAgeSeconds * 1000 });
}

export function closeSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string') throw unauthorized();
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload;
    req.user = { id: String(payload.sub), role: payload.role as Role };
  } catch {
    throw unauthorized('Session expirée, merci de vous reconnecter');
  }
  next();
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw forbidden();
    next();
  };

/** Utilisateur authentifié (à n'utiliser qu'après `authenticate`). */
export function currentUser(req: { user?: AuthUser }): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
