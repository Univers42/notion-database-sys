/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   App.tsx                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 20:22:58 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useMemo, useState } from 'react';
import { ObjectDatabase, RemoteAdapter } from '@notion-db/object-database';

type ThemeName = 'light' | 'dark';

const CONTRACT_SERVER_URL = import.meta.env.VITE_CONTRACT_SERVER_URL ?? 'http://localhost:4100';
const CONTRACT_SERVER_TOKEN = import.meta.env.VITE_CONTRACT_SERVER_TOKEN || undefined;

export function App() {
  const [theme, setTheme] = useState<ThemeName>('light');
  const adapter = useMemo(() => new RemoteAdapter({
    baseUrl: CONTRACT_SERVER_URL,
    token: CONTRACT_SERVER_TOKEN,
  }), []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100" data-theme={theme}>
      <section className="mx-auto flex w-full max-w-[1800px] flex-col gap-8 px-5 py-6 lg:px-8">
        <header className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-200">
                Reference parent project
              </p>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                  ObjectDatabase package integration
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                  This Vite app consumes the built <span className="font-semibold text-white">@notion-db/object-database</span> package,
                  connects through <span className="font-semibold text-white">RemoteAdapter</span>, and renders two independent component instances against the same contract server.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Theme</span>
              <div className="flex rounded-full bg-white/10 p-1">
                {(['light', 'dark'] as const).map((nextTheme) => (
                  <button
                    key={nextTheme}
                    type="button"
                    onClick={() => setTheme(nextTheme)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      theme === nextTheme
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {nextTheme[0].toUpperCase() + nextTheme.slice(1)}
                  </button>
                ))}
              </div>
              <p className="max-w-xs text-xs leading-5 text-slate-400">
                The toggle updates <code className="rounded bg-white/10 px-1.5 py-0.5">data-theme</code> on the parent wrapper and passes the same theme into each component instance.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(420px,0.55fr)]">
          <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl shadow-black/25" data-theme={theme}>
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Full page mode</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">Standalone database workspace</h2>
            </div>
            <div className="h-[760px] min-h-[620px]">
              <ObjectDatabase mode="page" adapter={adapter} theme={theme} />
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/25" data-theme={theme}>
            <div className="prose prose-invert max-w-none">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-200">Inline mode</p>
              <h2 className="text-2xl font-semibold text-white">Embedded in product content</h2>
              <p className="text-slate-300">
                This section simulates a host application page with prose, layout, and an inline ObjectDatabase embed.
                Edit a record in either instance: the contract server emits SSE updates and the other instance receives them through the package boundary.
              </p>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" data-theme={theme}>
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Inline project database</p>
                <p className="text-xs text-slate-500">Uses the same RemoteAdapter instance as the full-page view.</p>
              </div>
              <div className="h-[520px]">
                <ObjectDatabase mode="inline" adapter={adapter} theme={theme} />
              </div>
            </div>

            <aside className="mt-6 rounded-2xl border border-blue-300/20 bg-blue-500/10 p-4 text-sm leading-6 text-blue-50">
              <p className="font-semibold">Contract server</p>
              <p className="mt-1 text-blue-100">
                Current base URL: <code className="rounded bg-black/20 px-1.5 py-0.5">{CONTRACT_SERVER_URL}</code>
              </p>
              <p className="mt-2 text-blue-100">
                Override with <code className="rounded bg-black/20 px-1.5 py-0.5">VITE_CONTRACT_SERVER_URL</code> and, when auth is required, <code className="rounded bg-black/20 px-1.5 py-0.5">VITE_CONTRACT_SERVER_TOKEN</code>.
              </p>
            </aside>
          </article>
        </section>
      </section>
    </main>
  );
}
