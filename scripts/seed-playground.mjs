#!/usr/bin/env node
// ── scripts/seed-playground.mjs ──────────────────────────────────────────────
// Idempotent seed: registers 3 playground users (if they don't exist), creates
// a private workspace for each, then creates a shared workspace owned by admin
// and invites Alex (member) and Sam (guest).
//
// Usage:
//   node scripts/seed-playground.mjs
//   VITE_API_URL=http://localhost:4000 node scripts/seed-playground.mjs

const BASE = process.env.API_URL ?? process.env.VITE_API_URL ?? 'http://localhost:4000';

const PERSONAS = [
  { email: 'admin@playground.local',        password: 'playground123', name: 'Dylan Admin'      },
  { email: 'alex@playground.local',         password: 'playground123', name: 'Alex Collaborator' },
  { email: 'sam@playground.local',          password: 'playground123', name: 'Sam Guest'         },
];

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function safeJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status} ${res.statusText}): ${text.slice(0, 200)}`);
  }
}

async function post(path, body, jwt) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (res.status === 204) return null;
  return safeJson(res);
}

async function get(path, jwt) {
  const res = await fetch(`${BASE}${path}`, {
    headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
  });
  return safeJson(res);
}

// ── Auth: register or login (idempotent) ─────────────────────────────────────

async function ensureUser(persona) {
  // Try login first
  const login = await post('/api/auth/login', {
    email:    persona.email,
    password: persona.password,
  });

  if (login?.accessToken) {
    console.log(`  ✔  Logged in: ${persona.email}`);
    return login;
  }

  // Not yet registered
  const reg = await post('/api/auth/register', {
    email:    persona.email,
    password: persona.password,
    name:     persona.name,
  });

  if (reg?.accessToken) {
    console.log(`  ✔  Registered: ${persona.email}`);
    return reg;
  }

  throw new Error(`Failed to authenticate ${persona.email}: ${JSON.stringify(reg)}`);
}

// ── Workspace: get-or-create ──────────────────────────────────────────────────

async function ensureWorkspace(name, jwt) {
  const list = await get('/api/workspaces', jwt);
  const workspaces = Array.isArray(list) ? list : (list?.workspaces ?? []);
  const existing = workspaces.find(w => w.name === name);
  if (existing) {
    console.log(`  ✔  Workspace already exists: "${name}"`);
    return existing;
  }

  const ws = await post('/api/workspaces', { name }, jwt);
  if (ws?._id) {
    console.log(`  ✔  Created workspace: "${name}"`);
    return ws;
  }
  throw new Error(`Failed to create workspace "${name}": ${JSON.stringify(ws)}`);
}

// ── Invite member if not already present ─────────────────────────────────────

async function ensureMember(workspaceId, userId, role, adminJwt) {
  const members  = await get(`/api/workspaces/${workspaceId}/members`, adminJwt);
  const existing = (Array.isArray(members) ? members : []).find(m =>
    (m.userId ?? m._id ?? m.user?._id) === userId,
  );

  if (existing) {
    console.log(`  ✔  Member already in workspace: ${userId} (${role})`);
    return;
  }

  const res = await post(
    `/api/workspaces/${workspaceId}/members`,
    { userId, role },
    adminJwt,
  );
  // code 11000 = duplicate key → member already present
  if (res?.ok || String(res?.code) === '11000') {
    console.log(`  ✔  ${res?.ok ? 'Invited' : 'Already member'} ${userId} as ${role}`);
  } else {
    console.warn(`  ⚠  Could not invite ${userId}: ${JSON.stringify(res)}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('\n🌱  Seeding playground…\n');

// Step 1: Authenticate all personas
console.log('1/4  Authenticating users…');
const [adminAuth, alexAuth, samAuth] = await Promise.all(
  PERSONAS.map(ensureUser),
);

const adminJwt = adminAuth.accessToken;
const alexJwt  = alexAuth.accessToken;
const samJwt   = samAuth.accessToken;

// Derive user IDs from JWT payload (base64 middle segment)
function jwtSub(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).sub;
  } catch {
    return null;
  }
}

const adminId = jwtSub(adminJwt);
const alexId  = jwtSub(alexJwt);
const samId   = jwtSub(samJwt);

console.log(`  Admin: ${adminId}`);
console.log(`  Alex:  ${alexId}`);
console.log(`  Sam:   ${samId}`);

// Step 2: Private workspaces for each user
console.log('\n2/4  Ensuring private workspaces…');
await Promise.all([
  ensureWorkspace("Dylan's Workspace",      adminJwt),
  ensureWorkspace("Alex's Workspace",       alexJwt),
  ensureWorkspace("Sam's Workspace",        samJwt),
]);

// Step 3: Shared workspace owned by admin
console.log('\n3/4  Ensuring shared workspace…');
const sharedWs = await ensureWorkspace('Shared — Playground Team', adminJwt);

// Step 4: Invite Alex (member) and Sam (guest) to shared workspace
console.log('\n4/4  Inviting members to shared workspace…');
if (alexId)  await ensureMember(sharedWs._id, alexId, 'member', adminJwt);
if (samId)   await ensureMember(sharedWs._id, samId,  'guest',  adminJwt);

console.log('\n✅  Playground seed complete.\n');
