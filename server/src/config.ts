import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL est obligatoire'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET doit contenir au moins 32 caractères'),
  SESSION_HOURS: z.coerce.number().positive().default(12),
  QG_LAT: z.coerce.number().min(-90).max(90).default(48.8566),
  QG_LNG: z.coerce.number().min(-180).max(180).default(2.3522),
  DELIVERY_FEE_CENTS: z.coerce.number().int().nonnegative().default(250),
  FREE_DELIVERY_THRESHOLD_CENTS: z.coerce.number().int().nonnegative().default(1999),
  DELIVERY_RIDE_MINUTES: z.coerce.number().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  throw new Error(`Configuration invalide (voir server/.env.example) :\n${lines.join('\n')}`);
}

export const config = parsed.data;
export const isProduction = config.NODE_ENV === 'production';
