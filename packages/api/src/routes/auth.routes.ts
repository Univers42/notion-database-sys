/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   auth.routes.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:03:03 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:03:08 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { FastifyInstance } from 'fastify';
import { AuthService } from '@notion-db/core';

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(
    process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    process.env.JWT_EXPIRES_IN ?? '15m',
  );

  // POST /api/auth/register
  app.post<{
    Body: { email: string; password: string; name: string };
  }>('/register', async (request, reply) => {
    try {
      const { email, password, name } = request.body;
      const user = await authService.register(email, password, name);

      const accessToken = app.jwt.sign({ sub: user._id, email: user.email });
      const refreshToken = await authService.createSession(user._id, {
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });

      reply.code(201).send({ user, accessToken, refreshToken });
    } catch (err: unknown) {
      reply.code(400).send({ error: (err as Error).message });
    }
  });

  // POST /api/auth/login
  app.post<{
    Body: { email: string; password: string };
  }>('/login', async (request, reply) => {
    try {
      const { email, password } = request.body;
      const userId = await authService.authenticate(email, password);

      const accessToken = app.jwt.sign({ sub: userId, email });
      const refreshToken = await authService.createSession(userId, {
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });

      reply.send({ accessToken, refreshToken, user: { id: userId, email } });
    } catch (err: unknown) {
      reply.code(401).send({ error: (err as Error).message });
    }
  });

  // POST /api/auth/refresh
  app.post<{
    Body: { refreshToken: string };
  }>('/refresh', async (request, reply) => {
    const { refreshToken } = request.body;
    const userId = await authService.validateRefreshToken(refreshToken);
    if (!userId) {
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }

    // Rotate: revoke old, issue new
    await authService.revokeSession(refreshToken);
    const newRefreshToken = await authService.createSession(userId, {
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });

    const accessToken = app.jwt.sign({ sub: userId, email: '' });
    reply.send({ accessToken, refreshToken: newRefreshToken });
  });

  // POST /api/auth/logout
  app.post<{
    Body: { refreshToken: string };
  }>('/logout', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    await authService.revokeSession(request.body.refreshToken);
    reply.code(204).send();
  });
}
