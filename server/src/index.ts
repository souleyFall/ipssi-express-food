import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './db.js';

const server = createApp().listen(config.PORT, () => {
  console.log(`IPSSI Express Food API démarrée sur http://localhost:${config.PORT}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
