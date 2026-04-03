// ─── WebSocket routes — real-time sync via MongoDB Change Streams ────────────

import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

interface WsClient {
  userId: string;
  workspaceId: string;
  socket: any;
}

const clients = new Map<string, WsClient>();

export async function wsRoutes(app: FastifyInstance) {
  // WS /ws/:workspaceId
  app.get<{ Params: { workspaceId: string } }>(
    '/:workspaceId',
    { websocket: true },
    async (socket, request) => {
      // Verify JWT from query param
      const token = (request.query as any).token;
      if (!token) {
        socket.close(4001, 'Missing token');
        return;
      }

      let payload: { sub: string; email: string };
      try {
        payload = app.jwt.verify<{ sub: string; email: string }>(token);
      } catch {
        socket.close(4001, 'Invalid token');
        return;
      }

      const clientId = `${payload.sub}:${request.params.workspaceId}:${Date.now()}`;
      clients.set(clientId, {
        userId: payload.sub,
        workspaceId: request.params.workspaceId,
        socket,
      });

      app.log.info(`WS connected: ${clientId}`);

      socket.on('message', (raw: any) => {
        try {
          const msg = JSON.parse(raw.toString());
          // Handle cursor presence updates
          if (msg.type === 'cursor') {
            broadcastToWorkspace(request.params.workspaceId, clientId, {
              type: 'cursor',
              userId: payload.sub,
              ...msg,
            });
          }
        } catch {
          // Ignore malformed messages
        }
      });

      socket.on('close', () => {
        clients.delete(clientId);
        broadcastToWorkspace(request.params.workspaceId, clientId, {
          type: 'presence_leave',
          userId: payload.sub,
        });
      });
    },
  );

  // Start Change Stream watchers for real-time data sync
  startChangeStreams(app);
}

function broadcastToWorkspace(workspaceId: string, excludeClientId: string, data: unknown) {
  const msg = JSON.stringify(data);
  for (const [id, client] of clients) {
    if (client.workspaceId === workspaceId && id !== excludeClientId) {
      if (client.socket.readyState === 1) {
        client.socket.send(msg);
      }
    }
  }
}

function startChangeStreams(app: FastifyInstance) {
  const db = mongoose.connection;

  // Wait for connection to be ready
  db.once('open', () => {
    const collections = ['pages', 'blocks'];

    for (const collName of collections) {
      const collection = db.collection(collName);
      const stream = collection.watch([], { fullDocument: 'updateLookup' });

      stream.on('change', (change: any) => {
        const doc = change.fullDocument;
        if (!doc?.workspaceId) return;

        const workspaceId = doc.workspaceId.toString();
        const payload = {
          type: 'change',
          collection: collName,
          operationType: change.operationType,
          documentId: doc._id?.toString(),
          document: doc,
        };

        // Broadcast to all clients in the workspace
        for (const [, client] of clients) {
          if (client.workspaceId === workspaceId && client.socket.readyState === 1) {
            client.socket.send(JSON.stringify(payload));
          }
        }
      });

      stream.on('error', (err) => {
        app.log.error(`Change stream error on ${collName}: ${err.message}`);
      });

      app.log.info(`Change stream started for ${collName}`);
    }
  });
}
