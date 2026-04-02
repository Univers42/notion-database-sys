/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   database.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:06:27 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:06:28 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import mongoose from 'mongoose';

let isConnected = false;

export interface DatabaseConfig {
  uri: string;
  dbName?: string;
  maxPoolSize?: number;
}

/**
 * Connect to MongoDB — idempotent, safe to call multiple times.
 * Uses mongoose's built-in connection pooling.
 */
export async function connectDatabase(config: DatabaseConfig): Promise<typeof mongoose> {
  if (isConnected) return mongoose;

  const conn = await mongoose.connect(config.uri, {
    dbName: config.dbName,
    maxPoolSize: config.maxPoolSize ?? 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  isConnected = true;
  console.log(`[core] Connected to MongoDB: ${config.dbName ?? 'default'}`);
  return conn;
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}

/** Bootstrap all indexes defined in models */
export async function syncIndexes(): Promise<void> {
  const modelNames = mongoose.modelNames();
  for (const name of modelNames) {
    await mongoose.model(name).syncIndexes();
  }
  console.log(`[core] Synced indexes for ${modelNames.length} models`);
}
