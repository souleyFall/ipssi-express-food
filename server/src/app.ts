import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { errorHandler } from './middleware/error-handler.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { clientsRouter } from './modules/clients/clients.routes.js';
import { couriersRouter } from './modules/couriers/couriers.routes.js';
import { menuRouter } from './modules/menu/menu.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';

const clientDist = path.resolve(import.meta.dirname, '../../client/dist');

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          // Carte OpenStreetMap du suivi de livraison
          'frame-src': ["'self'", 'https://www.openstreetmap.org'],
          'img-src': ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );
  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser());

  app.get('/api/sante', (_req, res) => {
    res.json({ statut: 'ok' });
  });
  app.use('/api/auth', authRouter);
  app.use('/api/menu', menuRouter);
  app.use('/api/commandes', ordersRouter);
  app.use('/api/livreurs', couriersRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Route API introuvable' });
  });

  // En production, le même serveur sert le front React (une seule app à déployer).
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.get('/{*page}', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
