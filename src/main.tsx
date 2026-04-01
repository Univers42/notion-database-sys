/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   main.tsx                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:44:03 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:44:04 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFormulaEngine } from './lib/engine/bridge';

// Eagerly initialize the theme store so it applies data-theme before first paint
import './store/useThemeStore';

// Await WASM formula engine before first render to avoid #ERROR flash
initFormulaEngine().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
