#!/usr/bin/env node
/*
  setup_admin.js

  Usage (PowerShell):
    $env:SUPABASE_URL = "https://your-project.supabase.co"
    $env:SUPABASE_SERVICE_ROLE_KEY = "<your-service-role-key>"
    node supabase/setup_admin.js

  This script will:
  - create the user `admin@dough.com` with password `Joshua.Robles123` if it doesn't exist
  - if the user exists, update their password
  - insert a row into `public.user_roles` mapping the user to role 'admin'

  SECURITY: only run this locally or in a secure environment. Do NOT commit your service_role key.
*/

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as environment variables.');
  process.exit(1);
}

const ADMIN_EMAIL = 'admin@dough.com';
const ADMIN_PASSWORD = 'Joshua.Robles123';

const adminBase = SUPABASE_URL.replace(/\/$/, '') + '/auth/v1';
const restBase = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';

async function request(path, opts = {}) {
  const headers = Object.assign({}, opts.headers || {}, {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  });

  const res = await fetch(path, Object.assign({}, opts, { headers }));
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch (e) { body = text; }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function findUserByEmail(email) {
  // Supabase admin list users by email
  const url = `${adminBase}/admin/users?email=${encodeURIComponent(email)}`;
  const data = await request(url, { method: 'GET' });
  // The response should be an array of users
  if (Array.isArray(data) && data.length > 0) return data[0];
  return null;
}

async function createUser(email, password) {
  const url = `${adminBase}/admin/users`;
  const body = {
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'admin' }
  };
  return await request(url, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
}

async function updateUserPassword(userId, password) {
  const url = `${adminBase}/admin/users/${userId}`;
  const body = { password };
  return await request(url, { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
}

async function ensureUserRole(userId, role = 'admin') {
  const url = `${restBase}/user_roles`;
  // Try insert, but use ON CONFLICT via headers (PostgREST doesn't support ON CONFLICT in body)
  // We'll attempt an insert and ignore conflict errors by checking existing first
  // Check existing
  const existing = await request(`${restBase}/user_roles?user_id=eq.${userId}&role=eq.${encodeURIComponent(role)}`, { method: 'GET' });
  if (Array.isArray(existing) && existing.length > 0) {
    return existing[0];
  }

  const res = await request(url, { method: 'POST', body: JSON.stringify({ user_id: userId, role }), headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' } });
  return res?.[0] ?? res;
}

async function main() {
  try {
    console.log('Looking for existing user:', ADMIN_EMAIL);
    const user = await findUserByEmail(ADMIN_EMAIL);
    let userId = null;
    if (!user) {
      console.log('User not found, creating...');
      const created = await createUser(ADMIN_EMAIL, ADMIN_PASSWORD);
      // createUser may return an object representing the created user
      userId = created?.id || (created?.user && created.user.id) || null;
      console.log('Created user id:', userId);
    } else {
      userId = user.id;
      console.log('Found user id:', userId, ' — updating password...');
      await updateUserPassword(userId, ADMIN_PASSWORD);
      console.log('Password updated.');
    }

    if (!userId) throw new Error('Unable to determine user id after create/update.');

    console.log('Ensuring admin role in user_roles...');
    const roleRow = await ensureUserRole(userId, 'admin');
    console.log('Role inserted/exists:', roleRow);

    console.log('\nDONE. You can now sign in with:', ADMIN_EMAIL, ADMIN_PASSWORD);
  } catch (err) {
    console.error('Failed:', err.message || err);
    process.exit(1);
  }
}

main();
