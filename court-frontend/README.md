# Court-to-Community: Badminton Court Booking (prototype)

    server/   Node + Express + PostgreSQL API
    client/   React (Vite) + Tailwind UI (landing page + app)

## Run it (two terminals)

**Terminal 1: API**

    cd server
    cp .env.example .env        # set DATABASE_URL (DB_SSL=true for Neon)
    npm install
    npm run db:init             # ONCE ONLY: it drops and recreates tables
    npm start                   # http://localhost:4000

**Terminal 2: UI**

    cd client
    cp .env.example .env        # VITE_API_URL=http://localhost:4000
    npm install
    npm run dev                 # http://localhost:5173

## Concurrency test (headline demo)

    cd server && npm run test:concurrency

Expected: 1 confirmed (201), 29 rejected (409), PASS.

## Demo script (3-5 min)

1. Landing page: show live availability, stats and open games (all from the database).
2. Explore Courts, then sign up with a @thapar.edu email; show that a Gmail address is rejected.
3. Courts tab: pick a court and date, point out the free / booked / open colours.
4. Book a slot as User A.
5. Log in as User B (second browser window) and show the slot is now taken.
6. Run the concurrency test and show 0 double-bookings.
7. User A: My Bookings, "Open to join". User B: Open Games, "Request to join".
8. User A: My Bookings, Requests, Approve.
9. Close with progress vs the 14-week timeline and what's next (notifications, no-show scoring, admin dashboard).
