require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || 'thapar.edu').toLowerCase();

// ---------- helpers ----------
const sign = (u) => jwt.sign({ id: u.id, email: u.email, name: u.name }, JWT_SECRET, { expiresIn: '7d' });

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: 'Server error' });
});

// ---------- auth ----------
app.post('/auth/signup', wrap(async (req, res) => {
  const { name, email, password, skill_level } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  const em = String(email).trim().toLowerCase();
  if (!em.endsWith('@' + DOMAIN)) return res.status(403).json({ error: `Only @${DOMAIN} emails are allowed` });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const hash = await bcrypt.hash(password, 8);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, skill_level) VALUES ($1,$2,$3,$4)
       RETURNING id, name, email, skill_level`,
      [name, em, hash, ['beginner', 'intermediate', 'advanced'].includes(skill_level) ? skill_level : 'beginner']
    );
    res.status(201).json({ user: rows[0], token: sign(rows[0]) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    throw e;
  }
}));

app.post('/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body || {};
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [String(email || '').trim().toLowerCase()]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(password || '', u.password_hash))) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  res.json({ user: { id: u.id, name: u.name, email: u.email, skill_level: u.skill_level }, token: sign(u) });
}));

// ---------- courts & slots ----------
app.get('/courts', wrap(async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM courts ORDER BY id');
  res.json(rows);
}));

// Slots are generated from open/close hours and merged with existing bookings.
app.get('/courts/:id/slots', wrap(async (req, res) => {
  const date = req.query.date;
  if (!isDate(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' });
  const court = (await pool.query('SELECT * FROM courts WHERE id=$1', [req.params.id])).rows[0];
  if (!court) return res.status(404).json({ error: 'Court not found' });

  const { rows: booked } = await pool.query(
    `SELECT b.id, b.start_hour, b.is_open, b.max_players, b.user_id, u.name AS booked_by,
            (SELECT COUNT(*) FROM join_requests j WHERE j.booking_id=b.id AND j.status='approved')::int AS joined
       FROM bookings b JOIN users u ON u.id=b.user_id
      WHERE b.court_id=$1 AND b.booking_date=$2 AND b.status IN ('confirmed','completed','no_show')`,
    [court.id, date]
  );
  const byHour = Object.fromEntries(booked.map((b) => [b.start_hour, b]));
  const slots = [];
  for (let h = court.open_hour; h < court.close_hour; h++) {
    const b = byHour[h];
    slots.push(
      b
        ? { hour: h, status: b.is_open ? 'open' : 'booked', booking_id: b.id, booked_by: b.booked_by,
            booked_by_id: b.user_id, spots_left: b.is_open ? b.max_players - 1 - b.joined : 0 }
        : { hour: h, status: 'free' }
    );
  }
  res.json({ court, date, slots });
}));

// ---------- booking (conflict-safe) ----------
app.post('/bookings', auth, wrap(async (req, res) => {
  const { courtId, date, hour } = req.body || {};
  const h = Number(hour);
  if (!courtId || !isDate(date) || !Number.isInteger(h)) {
    return res.status(400).json({ error: 'courtId, date (YYYY-MM-DD), hour required' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Row-level lock on the court serialises concurrent bookings for it.
    const court = (await client.query('SELECT * FROM courts WHERE id=$1 FOR UPDATE', [courtId])).rows[0];
    if (!court) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Court not found' }); }
    if (h < court.open_hour || h >= court.close_hour) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Court is open ${court.open_hour}:00-${court.close_hour}:00` });
    }
    const clash = await client.query(
      `SELECT 1 FROM bookings WHERE court_id=$1 AND booking_date=$2 AND start_hour=$3
         AND status IN ('confirmed','completed','no_show')`,
      [courtId, date, h]
    );
    if (clash.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Slot already booked' });
    }
    const { rows } = await client.query(
      `INSERT INTO bookings (court_id, user_id, booking_date, start_hour) VALUES ($1,$2,$3,$4) RETURNING *`,
      [courtId, req.user.id, date, h]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    // Backstop: the unique index rejects a duplicate even if app logic were bypassed.
    if (e.code === '23505') return res.status(409).json({ error: 'Slot already booked' });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
}));

app.get('/bookings/mine', auth, wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT b.*, to_char(b.booking_date,'YYYY-MM-DD') AS date, c.name AS court_name,
            (SELECT COUNT(*) FROM join_requests j WHERE j.booking_id=b.id AND j.status='pending')::int AS pending_requests
       FROM bookings b JOIN courts c ON c.id=b.court_id
      WHERE b.user_id=$1 AND b.status<>'cancelled'
      ORDER BY b.booking_date DESC, b.start_hour DESC`,
    [req.user.id]
  );
  res.json(rows);
}));

app.delete('/bookings/:id', auth, wrap(async (req, res) => {
  const { rowCount } = await pool.query(
    `UPDATE bookings SET status='cancelled', is_open=false WHERE id=$1 AND user_id=$2 AND status='confirmed'`,
    [req.params.id, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Booking not found' });
  res.json({ ok: true });
}));

// ---------- open-slot matchmaking ----------
app.patch('/bookings/:id/open', auth, wrap(async (req, res) => {
  const isOpen = !!(req.body || {}).isOpen;
  const { rows } = await pool.query(
    `UPDATE bookings SET is_open=$1 WHERE id=$2 AND user_id=$3 AND status='confirmed' RETURNING *`,
    [isOpen, req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });
  res.json(rows[0]);
}));

// Open slots other people can join
app.get('/open-slots', auth, wrap(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT b.id, to_char(b.booking_date,'YYYY-MM-DD') AS date, b.start_hour, b.max_players,
            b.user_id AS host_id, c.name AS court_name, u.name AS host, u.skill_level,
            (SELECT COUNT(*) FROM join_requests j WHERE j.booking_id=b.id AND j.status='approved')::int AS joined
       FROM bookings b JOIN courts c ON c.id=b.court_id JOIN users u ON u.id=b.user_id
      WHERE b.is_open AND b.status='confirmed' AND b.booking_date >= CURRENT_DATE
      ORDER BY b.booking_date, b.start_hour`
  );
  res.json(rows);
}));

app.post('/bookings/:id/join', auth, wrap(async (req, res) => {
  const b = (await pool.query(`SELECT * FROM bookings WHERE id=$1 AND is_open AND status='confirmed'`, [req.params.id])).rows[0];
  if (!b) return res.status(404).json({ error: 'Slot is not open to join' });
  if (b.user_id === req.user.id) return res.status(400).json({ error: 'This is your own booking' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO join_requests (booking_id, user_id) VALUES ($1,$2) RETURNING *`,
      [b.id, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'You already requested this slot' });
    throw e;
  }
}));

// Host sees requests for their booking
app.get('/bookings/:id/requests', auth, wrap(async (req, res) => {
  const own = await pool.query('SELECT 1 FROM bookings WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!own.rowCount) return res.status(404).json({ error: 'Booking not found' });
  const { rows } = await pool.query(
    `SELECT j.id, j.status, u.name, u.skill_level FROM join_requests j JOIN users u ON u.id=j.user_id
      WHERE j.booking_id=$1 ORDER BY j.created_at`,
    [req.params.id]
  );
  res.json(rows);
}));

// Host approves / declines
app.patch('/join-requests/:id', auth, wrap(async (req, res) => {
  const status = (req.body || {}).status;
  if (!['approved', 'declined'].includes(status)) return res.status(400).json({ error: 'status must be approved or declined' });
  const { rows } = await pool.query(
    `UPDATE join_requests j SET status=$1
       FROM bookings b
      WHERE j.id=$2 AND b.id=j.booking_id AND b.user_id=$3
      RETURNING j.*`,
    [status, req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Request not found' });
  res.json(rows[0]);
}));

// Requests I have sent
app.get('/join-requests/mine', auth, wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT j.id, j.status, to_char(b.booking_date,'YYYY-MM-DD') AS date, b.start_hour, c.name AS court_name
       FROM join_requests j JOIN bookings b ON b.id=j.booking_id JOIN courts c ON c.id=b.court_id
      WHERE j.user_id=$1 ORDER BY j.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}));

// ---------- public landing-page data (no login, no personal info) ----------
const ACTIVE = `('confirmed','completed','no_show')`;
app.get('/public/summary', wrap(async (_req, res) => {
  const now = new Date();
  const today = now.toLocaleDateString('en-CA');
  const nowHour = now.getHours();
  const [users, courts, week, open, todayBooked] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS n FROM users'),
    pool.query('SELECT * FROM courts ORDER BY id'),
    pool.query(
      `SELECT COUNT(*)::int AS n FROM bookings
        WHERE status IN ${ACTIVE} AND booking_date BETWEEN $1::date AND $1::date + 7`, [today]),
    pool.query(
      `SELECT b.id, to_char(b.booking_date,'YYYY-MM-DD') AS date, b.start_hour, b.max_players,
              c.name AS court_name, u.skill_level,
              (SELECT COUNT(*) FROM join_requests j WHERE j.booking_id=b.id AND j.status='approved')::int AS joined
         FROM bookings b JOIN courts c ON c.id=b.court_id JOIN users u ON u.id=b.user_id
        WHERE b.is_open AND b.status='confirmed'
          AND (b.booking_date > $1::date OR (b.booking_date = $1::date AND b.start_hour > $2))
        ORDER BY b.booking_date, b.start_hour LIMIT 8`, [today, nowHour]),
    pool.query(
      `SELECT court_id, COUNT(*)::int AS n FROM bookings
        WHERE booking_date=$1::date AND start_hour > $2 AND status IN ${ACTIVE} GROUP BY court_id`, [today, nowHour]),
  ]);
  const bookedBy = Object.fromEntries(todayBooked.rows.map((r) => [r.court_id, r.n]));
  const courtList = courts.rows.map((c) => {
    const remaining = Math.max(0, c.close_hour - Math.max(c.open_hour, nowHour + 1));
    const free = Math.max(0, remaining - (bookedBy[c.id] || 0));
    return { id: c.id, name: c.name, location: c.location, sport: c.sport,
             open_hour: c.open_hour, close_hour: c.close_hour, free_today: free,
             availability: free === 0 ? 'full' : free <= 4 ? 'few' : 'many' };
  });
  res.json({
    stats: { players: users.rows[0].n, courts: courtList.length, games_week: week.rows[0].n, open_games: open.rowCount },
    courts: courtList,
    open_games: open.rows.map((g) => ({ ...g, spots_left: Math.max(0, g.max_players - 1 - g.joined) })),
  });
}));

app.get('/health', (_req, res) => res.json({ ok: true }));

if (require.main === module) {
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}
module.exports = app;
