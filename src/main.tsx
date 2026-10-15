/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   main.tsx                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:44:03 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 16:01:56 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ObjectDatabase from './object_database';
import { HttpAdapter } from './component/adapters';
import './index.css';

import { installStandaloneTheme } from './store/dbms/hardcoded/useThemeStore.ts';

// Standalone, this app owns <html data-theme>: apply it before first paint.
installStandaloneTheme();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ObjectDatabase mode="page" adapter={new HttpAdapter()} />
    </StrictMode>,
  );
}
