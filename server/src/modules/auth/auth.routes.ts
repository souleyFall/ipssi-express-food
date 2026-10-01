import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../../config.js';
import { prisma } from '../../db.js';
import { conflict, unauthorized } from '../../lib/http-error.js';
import { email, password, phone, shortText } from '../../lib/validation.js';
import {
  authenticate,
  closeSession,
  currentUser,
  openSession,
  type AuthUser,
} from '../../middleware/auth.js';
import { DUMMY_HASH, emailTaken, findAccount, hashPassword, profileOf } from './auth.service.js';

const registerSchema = z.object({
  prenom: shortText(50),
  nom: shortText(50),
  email,
  motDePasse: password,
  telephone: phone.optional(),
  adresse: z.string().trim().max(200).optional(),
  accepteCgu: z.literal(true, {
    error: 'Vous devez accepter les CGU et la politique de confidentialité',
  }),
  accepteEmails: z.boolean().default(false),
});

const loginSchema = z.object({
  email,
  motDePasse: z.string().min(1).max(100),
});

// Protection contre le bruteforce des mots de passe.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Trop de tentatives, réessayez dans quelques minutes' },
});


export const authRouter = Router();

authRouter.post('/inscription', authLimiter, async (req, res) => {
  const input = registerSchema.parse(req.body);
  if (await emailTaken(input.email)) throw conflict('Un compte existe déjà avec cet email');

  const client = await prisma.client.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.motDePasse),
      firstName: input.prenom,
      lastName: input.nom,
      phone: input.telephone || null,
      address: input.adresse || null,
      cguAcceptedAt: new Date(),
      marketingOptIn: input.accepteEmails,
    },
  });
  const user: AuthUser = { id: client.id, role: 'client' };
  openSession(res, user);
  res.status(201).json(await profileOf(user));
});

authRouter.post('/connexion', authLimiter, async (req, res) => {
  const input = loginSchema.parse(req.body);
  const found = await findAccount(input.email);
  const valid = await bcrypt.compare(input.motDePasse, found?.account.passwordHash ?? DUMMY_HASH);
  if (!found || !valid) throw unauthorized('Email ou mot de passe incorrect');

  const user: AuthUser = { id: found.account.id, role: found.role };
  openSession(res, user);
  res.json(await profileOf(user));
});

authRouter.post('/deconnexion', (_req, res) => {
  closeSession(res);
  res.status(204).end();
});

authRouter.get('/moi', authenticate, async (req, res) => {
  const profile = await profileOf(currentUser(req));
  if (!profile) {
    closeSession(res);
    throw unauthorized('Compte introuvable');
  }
  res.json(profile);
});
