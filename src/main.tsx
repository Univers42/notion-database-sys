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

// Eagerly initialize the theme store so it applies data-theme before first paint
import './store/dbms/hardcoded/useThemeStore.ts';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ObjectDatabase mode="page" adapter={new HttpAdapter()} />
    </StrictMode>,
  );
}
