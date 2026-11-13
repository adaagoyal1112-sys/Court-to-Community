# Court-to-Community: Backend (Node + Express + PostgreSQL)

## Setup (5 minutes)

1. Install Node 18+ and PostgreSQL (or use a free Neon/Supabase database).
2. `cp .env.example .env` and edit `DATABASE_URL` (set `DB_SSL=true` for hosted DBs).
3. `npm install`
4. `npm run db:init`   (creates tables + seeds 3 badminton courts)
5. `npm start`         (API on http://localhost:4000)

## Concurrency test (headline demo)

With the server running, in a second terminal:

    npm run test:concurrency            # 30 simultaneous requests
    N=50 npm run test:concurrency       # try 50

Expected: 1 confirmed (201), the rest rejected (409), 1 row in DB, `PASS`.

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /auth/signup | no | `{name,email,password,skill_level?}`; only @thapar.edu |
| POST | /auth/login | no | `{email,password}` returns `{user,token}` |
| GET | /courts | no | list courts |
| GET | /courts/:id/slots?date=YYYY-MM-DD | no | slots with status `free`, `booked` or `open` |
| POST | /bookings | yes | `{courtId,date,hour}`; 201, or 409 if taken |
| GET | /bookings/mine | yes | my bookings |
| DELETE | /bookings/:id | yes | cancel (frees the slot) |
| PATCH | /bookings/:id/open | yes | `{isOpen:true/false}` |
| GET | /open-slots | yes | open slots others can join |
| POST | /bookings/:id/join | yes | request to join |
| GET | /bookings/:id/requests | yes | host views requests |
| PATCH | /join-requests/:id | yes | host sets `{status:'approved'|'declined'}` |
| GET | /join-requests/mine | yes | requests I sent |

Send the token as `Authorization: Bearer <token>`.

## How double-booking is prevented

1. Partial unique index `uniq_active_slot` on `(court_id, booking_date, start_hour)` (schema.sql).
2. `POST /bookings` runs in a transaction that takes `SELECT ... FOR UPDATE` on the court row, so concurrent requests for that court are serialised.
3. Conflicts return an explicit 409. Nothing is silently overwritten.
