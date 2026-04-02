/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   auth.hook.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:03:48 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:03:50 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { FastifyRequest, FastifyReply } from 'fastify';

export async function authHook(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

// Extend Fastify instance with the authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authHook;
  }
}

// Extend JWT payload with our user fields
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { sub: string; email: string };
  }
}
