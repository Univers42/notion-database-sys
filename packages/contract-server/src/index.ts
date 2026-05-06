/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   index.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:13:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import 'dotenv/config';
import { closeMongo } from './db/connections';
import { buildServer } from './server';

const port = Number(process.env.CONTRACT_SERVER_PORT || '4100');
const host = process.env.CONTRACT_SERVER_HOST || '0.0.0.0';
const app = await buildServer();

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, 'contract-server shutting down');
  await app.close();
  await closeMongo();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ host, port });
