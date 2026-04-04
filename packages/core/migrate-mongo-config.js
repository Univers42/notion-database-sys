// ─── migrate-mongo configuration ────────────────────────────────────────────
// Run migrations: npx migrate-mongo up
// Create migration: npx migrate-mongo create <name>
// Rollback: npx migrate-mongo down

const config = {
  mongodb: {
    url: process.env.MONGO_URI || 'mongodb://notion_user:notion_pass@localhost:27017',
    databaseName: process.env.MONGO_DB || 'notion_db',
    options: {
      authSource: 'admin',
    },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'esm',
};

export default config;
