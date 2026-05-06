/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   render.tsx                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 19:36:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { renderToString } from 'react-dom/server';
import { InMemoryAdapter, ObjectDatabase, type NotionState } from '@notion-db/object-database';

const now = new Date().toISOString();
const state: NotionState = {
  databases: {
    'db-test': {
      id: 'db-test',
      name: 'Test database',
      titlePropertyId: 'prop-title',
      properties: {
        'prop-title': { id: 'prop-title', name: 'Name', type: 'title' },
      },
    },
  },
  pages: {
    'page-test': {
      id: 'page-test',
      databaseId: 'db-test',
      properties: { 'prop-title': 'Package smoke row' },
      content: [],
      createdAt: now,
      updatedAt: now,
      createdBy: 'test-consumer',
      lastEditedBy: 'test-consumer',
    },
  },
  views: {
    'view-test': {
      id: 'view-test',
      databaseId: 'db-test',
      name: 'Table',
      type: 'table',
      filters: [],
      filterConjunction: 'and',
      sorts: [],
      visibleProperties: ['prop-title'],
      settings: {},
    },
  },
};

const adapter = new InMemoryAdapter(state);
const html = renderToString(<ObjectDatabase mode="inline" databaseId="db-test" adapter={adapter} />);

if (!html) throw new Error('ObjectDatabase rendered empty HTML');
console.log('test-consumer-render-ok');
