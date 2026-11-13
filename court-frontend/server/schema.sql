-- Court-to-Community: badminton court booking schema
-- Run with: psql "$DATABASE_URL" -f schema.sql

DROP TABLE IF EXISTS join_requests CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS courts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  skill_level   TEXT NOT NULL DEFAULT 'beginner'
                CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE courts (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  sport      TEXT NOT NULL DEFAULT 'badminton',
  location   TEXT NOT NULL,
  open_hour  INT  NOT NULL DEFAULT 6  CHECK (open_hour BETWEEN 0 AND 23),
  close_hour INT  NOT NULL DEFAULT 22 CHECK (close_hour BETWEEN 1 AND 24),
  CHECK (close_hour > open_hour)
);

-- One row per booked 1-hour slot. Slots themselves are generated from the
-- court's open/close hours, so only booked slots are stored.
CREATE TABLE bookings (
  id           SERIAL PRIMARY KEY,
  court_id     INT  NOT NULL REFERENCES courts(id),
  user_id      INT  NOT NULL REFERENCES users(id),
  booking_date DATE NOT NULL,
  start_hour   INT  NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
  status       TEXT NOT NULL DEFAULT 'confirmed'
               CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  is_open      BOOLEAN NOT NULL DEFAULT FALSE,
  max_players  INT NOT NULL DEFAULT 4 CHECK (max_players BETWEEN 2 AND 8),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DB-level guarantee: at most one active booking per (court, date, hour).
-- Partial index so a cancelled booking frees the slot again.
CREATE UNIQUE INDEX uniq_active_slot
  ON bookings (court_id, booking_date, start_hour)
  WHERE status IN ('confirmed', 'completed', 'no_show');

CREATE INDEX idx_bookings_user ON bookings (user_id);
CREATE INDEX idx_bookings_court_date ON bookings (court_id, booking_date);

CREATE TABLE join_requests (
  id         SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id),
  status     TEXT NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'approved', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, user_id)
);

-- Seed data
INSERT INTO courts (name, location, open_hour, close_hour) VALUES
  ('Badminton Court 1', 'Sports Complex, Indoor Hall', 6, 22),
  ('Badminton Court 2', 'Sports Complex, Indoor Hall', 6, 22),
  ('Badminton Court 3', 'Hostel Block Courts',         7, 21);
