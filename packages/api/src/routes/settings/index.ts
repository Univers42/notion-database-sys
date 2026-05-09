import type { FastifyInstance } from 'fastify';
import { accountRoutes } from './account.routes.js';
import { billingRoutes } from './billing.routes.js';
import { connectionsRoutes } from './connections.routes.js';
import { importsRoutes } from './imports.routes.js';
import { notificationsRoutes } from './notifications.routes.js';
import { preferencesRoutes } from './preferences.routes.js';
import { workspaceSettingsRoutes } from './workspace.routes.js';

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);
  await app.register(accountRoutes);
  await app.register(preferencesRoutes);
  await app.register(notificationsRoutes);
  await app.register(connectionsRoutes);
  await app.register(workspaceSettingsRoutes);
  await app.register(importsRoutes);
  await app.register(billingRoutes);
}
