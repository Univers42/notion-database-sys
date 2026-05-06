/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   schema.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:13:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { FastifyInstance } from 'fastify';
import type { MetaState, OkResponse, PropertyType, SchemaProperty } from '../types';
import { loadMeta } from './pageStorage';

const ANY_OBJECT = { type: 'object', additionalProperties: true } as const;

/** Registers schema mutation contract routes. */
export async function registerSchemaRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { databaseId: string; property: SchemaProperty } }>('/addProperty', {
    schema: {
      body: {
        type: 'object',
        required: ['databaseId', 'property'],
        additionalProperties: false,
        properties: { databaseId: { type: 'string' }, property: ANY_OBJECT },
      },
    },
  }, async (request): Promise<OkResponse> => {
    await addProperty(app, request.body.databaseId, request.body.property);
    return { ok: true };
  });

  app.post<{ Body: { databaseId: string; propertyId: string } }>('/removeProperty', {
    schema: {
      body: {
        type: 'object',
        required: ['databaseId', 'propertyId'],
        additionalProperties: false,
        properties: { databaseId: { type: 'string' }, propertyId: { type: 'string' } },
      },
    },
  }, async (request): Promise<OkResponse> => {
    await removeProperty(app, request.body.databaseId, request.body.propertyId);
    return { ok: true };
  });

  app.post<{ Body: { databaseId: string; propertyId: string; newType: PropertyType } }>('/changePropertyType', {
    schema: {
      body: {
        type: 'object',
        required: ['databaseId', 'propertyId', 'newType'],
        additionalProperties: false,
        properties: {
          databaseId: { type: 'string' },
          propertyId: { type: 'string' },
          newType: { type: 'string' },
        },
      },
    },
  }, async (request): Promise<OkResponse> => {
    await changePropertyType(app, request.body.databaseId, request.body.propertyId, request.body.newType);
    return { ok: true };
  });
}

/** Adds one schema property to the _meta collection. */
export async function addProperty(app: FastifyInstance, databaseId: string, property: SchemaProperty): Promise<void> {
  const meta = await loadMeta(app.mongo);
  const database = meta.databases[databaseId];
  if (!database) throw new Error(`Unknown databaseId: ${databaseId}`);

  await app.mongo.collection<MetaState>('_meta').updateOne(
    { _id: 'notion-state' },
    {
      $set: {
        [`databases.${databaseId}.properties.${property.id}`]: property,
        updatedAt: new Date().toISOString(),
      },
    },
  );
}

/** Removes one schema property from the _meta collection. */
export async function removeProperty(app: FastifyInstance, databaseId: string, propertyId: string): Promise<void> {
  await loadMeta(app.mongo);
  await app.mongo.collection<MetaState>('_meta').updateOne(
    { _id: 'notion-state' },
    {
      $unset: { [`databases.${databaseId}.properties.${propertyId}`]: '' },
      $set: { updatedAt: new Date().toISOString() },
    },
  );
}

/** Changes one schema property type in the _meta collection. */
export async function changePropertyType(
  app: FastifyInstance,
  databaseId: string,
  propertyId: string,
  newType: PropertyType,
): Promise<void> {
  await loadMeta(app.mongo);
  await app.mongo.collection<MetaState>('_meta').updateOne(
    { _id: 'notion-state' },
    {
      $set: {
        [`databases.${databaseId}.properties.${propertyId}.type`]: newType,
        updatedAt: new Date().toISOString(),
      },
    },
  );
}
