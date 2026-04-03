// ─── Initial migration: create collections + indexes ────────────────────────
// This migration creates all workspace system collections and indexes.
// It does NOT touch existing entity data collections (tasks, contacts, etc.)

export const up = async (db) => {
  // 1. workspaces
  await db.createCollection('workspaces');
  await db.collection('workspaces').createIndex({ ownerId: 1 });
  await db.collection('workspaces').createIndex({ domain: 1 }, { sparse: true, unique: true });

  // 2. users
  await db.createCollection('users');
  await db.collection('users').createIndex({ email: 1 }, { unique: true });

  // 3. workspace_members
  await db.createCollection('workspace_members');
  await db.collection('workspace_members').createIndex({ workspaceId: 1, userId: 1 }, { unique: true });
  await db.collection('workspace_members').createIndex({ userId: 1, workspaceId: 1 });

  // 4. pages
  const pagesExists = await db.listCollections({ name: 'pages' }).hasNext();
  if (!pagesExists) {
    await db.createCollection('pages');
  }
  await db.collection('pages').createIndex({ workspaceId: 1, databaseId: 1 });
  await db.collection('pages').createIndex({ parentPageId: 1 });
  await db.collection('pages').createIndex({ workspaceId: 1, archived: 1 });

  // 5. blocks
  await db.createCollection('blocks');
  await db.collection('blocks').createIndex({ pageId: 1, order: 1 });
  await db.collection('blocks').createIndex({ workspaceId: 1, pageId: 1 });
  await db.collection('blocks').createIndex({ parentBlockId: 1, order: 1 });
  await db.collection('blocks').createIndex({ syncedBlockId: 1 }, { sparse: true });

  // 6. view_configs
  await db.createCollection('viewconfigs');
  await db.collection('viewconfigs').createIndex({ databaseId: 1, workspaceId: 1 });

  // 7. user_view_overrides
  await db.createCollection('userviewoverrides');
  await db.collection('userviewoverrides').createIndex({ viewId: 1, userId: 1 }, { unique: true });
  await db.collection('userviewoverrides').createIndex({ userId: 1, workspaceId: 1 });

  // 8. access_rules
  await db.createCollection('accessrules');
  await db.collection('accessrules').createIndex({ workspaceId: 1, resourceId: 1, resourceType: 1 });
  await db.collection('accessrules').createIndex({ workspaceId: 1, resourceType: 1 }, { sparse: true });
  await db.collection('accessrules').createIndex({ 'target.userId': 1, workspaceId: 1 }, { sparse: true });

  // 9. effective_permissions (TTL cache)
  await db.createCollection('effectivepermissions');
  await db.collection('effectivepermissions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('effectivepermissions').createIndex({ userId: 1, resourceId: 1 }, { unique: true });
  await db.collection('effectivepermissions').createIndex({ resourceId: 1 });

  // 10. sessions (TTL)
  await db.createCollection('sessions');
  await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('sessions').createIndex({ refreshToken: 1 }, { unique: true });
  await db.collection('sessions').createIndex({ userId: 1 });
};

export const down = async (db) => {
  // Only drop new workspace-system collections — NEVER drop entity data
  const toDrop = [
    'workspaces', 'users', 'workspace_members',
    'blocks', 'viewconfigs', 'userviewoverrides',
    'accessrules', 'effectivepermissions', 'sessions',
  ];
  for (const name of toDrop) {
    const exists = await db.listCollections({ name }).hasNext();
    if (exists) await db.collection(name).drop();
  }
};
