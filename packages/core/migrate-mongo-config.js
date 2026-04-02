/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   migrate-mongo-config.js                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:06:43 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:06:44 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/* global process */
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
