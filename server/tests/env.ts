import { inject } from 'vitest';

// Variables lues par src/config.ts : à définir avant tout import de l'application.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = inject('databaseUrl');
process.env.JWT_SECRET = 'secret-de-test-uniquement-pour-vitest-000000';
process.env.DELIVERY_FEE_CENTS = '250';
process.env.FREE_DELIVERY_THRESHOLD_CENTS = '1999';
