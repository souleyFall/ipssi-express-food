import { execSync } from 'node:child_process';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

/** Démarre un MongoDB en mémoire (replica set, exigé par Prisma) et y crée les index. */
export default async function setup(project: TestProject) {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ launchTimeout: 60_000 }],
  });
  const databaseUrl = replSet.getUri('express-food-test');

  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
  project.provide('databaseUrl', databaseUrl);

  return async () => {
    await replSet.stop();
  };
}
