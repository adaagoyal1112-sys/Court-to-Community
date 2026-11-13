// Concurrency test: N users try to book the SAME slot at the SAME instant.
// Expected: exactly 1 success (201), everyone else gets 409, and the DB holds 1 row.
//
// Usage: start the API first (npm start), then: npm run test:concurrency
// Optional: API_URL=http://localhost:4000 N=30 npm run test:concurrency
require('dotenv').config();
const pool = require('../db');

const API = process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`;
const N = Number(process.env.N || 30);
const DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || 'thapar.edu';

async function post(path, body, token) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function getToken(i) {
  const email = `loadtest${i}@${DOMAIN}`;
  const creds = { name: `Load Test ${i}`, email, password: 'password123' };
  let r = await post('/auth/signup', creds);
  if (r.status === 409) r = await post('/auth/login', creds);
  if (!r.body.token) throw new Error(`Could not get token for ${email}: ${JSON.stringify(r.body)}`);
  return r.body.token;
}

(async () => {
  console.log(`Preparing ${N} test users...`);
  const tokens = [];
  for (let i = 1; i <= N; i++) tokens.push(await getToken(i));

  // A far-future date so the test never collides with real demo bookings.
  const date = '2030-01-15';
  const hour = 10;
  const courtId = 1;
  await pool.query('DELETE FROM bookings WHERE court_id=$1 AND booking_date=$2 AND start_hour=$3', [courtId, date, hour]);

  console.log(`Firing ${N} simultaneous booking requests for court ${courtId}, ${date} ${hour}:00 ...`);
  const t0 = Date.now();
  const results = await Promise.all(tokens.map((t) => post('/bookings', { courtId, date, hour }, t)));
  const ms = Date.now() - t0;

  const ok = results.filter((r) => r.status === 201).length;
  const conflict = results.filter((r) => r.status === 409).length;
  const other = results.length - ok - conflict;
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM bookings WHERE court_id=$1 AND booking_date=$2 AND start_hour=$3 AND status='confirmed'`,
    [courtId, date, hour]
  );

  console.log('\n=========== CONCURRENCY TEST RESULT ===========');
  console.log(`Requests sent          : ${N}`);
  console.log(`Confirmed (201)        : ${ok}`);
  console.log(`Rejected  (409)        : ${conflict}`);
  console.log(`Other / errors         : ${other}`);
  console.log(`Rows in DB for slot    : ${rows[0].n}`);
  console.log(`Total time             : ${ms} ms`);
  const pass = ok === 1 && conflict === N - 1 && rows[0].n === 1;
  console.log(pass ? '\nPASS: 0 double-bookings (BCR target met)' : '\nFAIL: double-booking or unexpected errors detected');
  console.log('===============================================');

  await pool.query('DELETE FROM bookings WHERE court_id=$1 AND booking_date=$2 AND start_hour=$3', [courtId, date, hour]);
  await pool.end();
  process.exit(pass ? 0 : 1);
})().catch((e) => {
  console.error('Test failed to run:', e.message);
  process.exit(1);
});
