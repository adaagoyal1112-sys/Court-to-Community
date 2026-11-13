import React, { useEffect, useState } from 'react';
import { api, dayLabel, fmtHour } from '../api.js';
import Logo from '../components/Logo.jsx';

const DOT = { many: 'bg-lime', few: 'bg-amber', full: 'bg-rose-500' };
const AVAIL_TEXT = { many: 'Open slots', few: 'Few slots left', full: 'Fully booked today' };
// Pin positions on the stylised campus map (percent of the map box).
const PINS = [{ x: 30, y: 38 }, { x: 56, y: 22 }, { x: 70, y: 58 }, { x: 40, y: 70 }, { x: 82, y: 30 }];

export default function Landing({ user, onEnter, onLogin }) {
  const [data, setData] = useState(null);
  const [pin, setPin] = useState(0);

  useEffect(() => { api('/public/summary').then(setData).catch(() => setData({ stats: {}, courts: [], open_games: [], offline: true })); }, []);

  const courts = data?.courts || [];
  const games = data?.open_games || [];
  const stats = data?.stats || {};
  const available = courts.filter((c) => c.availability !== 'full');
  const picked = courts[pin];

  return (
    <div className="overflow-x-hidden">
      {/* ---------- NAV ---------- */}
      <header className="absolute top-0 inset-x-0 z-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6 flex items-center justify-between">
          <Logo onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
          <nav className="hidden md:flex items-center gap-9 font-semibold text-white/85">
            <a href="#courts" className="hover:text-lime">Courts</a>
            <button onClick={() => onEnter('open')} className="hover:text-lime">Find a Game</button>
            <a href="#how" className="hover:text-lime">How it works</a>
          </nav>
          <div className="flex items-center gap-3">
            {!user && <button onClick={onLogin} className="hidden sm:block font-semibold text-white/85 hover:text-lime">Log in</button>}
            <button onClick={() => onEnter('courts')} className="bg-white text-black font-bold rounded-full px-4 sm:px-6 py-2.5 sm:py-3 whitespace-nowrap text-sm sm:text-base hover:bg-lime transition">
              {user ? 'Open app' : 'Open app'}
            </button>
          </div>
        </div>
      </header>

      {/* ---------- HERO ---------- */}
      <section className="relative min-h-screen flex items-center pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(47,107,255,0.30),transparent_55%),radial-gradient(ellipse_at_10%_90%,rgba(182,242,58,0.14),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] bg-[size:56px_56px]" />
        {/* decorative badminton court lines */}
        <svg className="absolute right-[-6%] top-[8%] w-[62%] opacity-[0.12] hidden lg:block" viewBox="0 0 400 560" fill="none" stroke="#b6f23a" strokeWidth="3">
          <rect x="20" y="20" width="360" height="520" rx="6" /><line x1="20" y1="280" x2="380" y2="280" strokeWidth="6" />
          <line x1="60" y1="20" x2="60" y2="540" /><line x1="340" y1="20" x2="340" y2="540" />
          <line x1="20" y1="170" x2="380" y2="170" /><line x1="20" y1="390" x2="380" y2="390" /><line x1="200" y1="20" x2="200" y2="170" /><line x1="200" y1="390" x2="200" y2="540" />
        </svg>
        <span className="absolute right-[12%] top-[20%] text-7xl floaty hidden lg:block">🏸</span>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 w-full flex flex-col gap-10">
          <div>
            <span className="eyebrow inline-flex items-center gap-2 border border-white/15 rounded-full px-4 py-2.5 bg-white/[0.03]">
              <span className="text-lime">⚡</span> Thapar campus · live now
            </span>
            <h1 className="display text-[3.4rem] sm:text-[6rem] lg:text-[8rem] mt-8">
              Your Campus.<br /><span className="text-lime">Your Game.</span>
            </h1>
            <p className="text-xl sm:text-2xl text-white/75 mt-6">Book courts. Find your people. Play more.</p>
            <div className="flex flex-wrap gap-4 mt-10">
              <button onClick={() => onEnter('courts')} className="btn-lime px-8 py-4 text-lg">Explore Courts →</button>
              <button onClick={() => onEnter('open')} className="btn-ghost px-8 py-4 text-lg">Find a Game</button>
            </div>
          </div>

          <aside className="card p-6 backdrop-blur bg-panel/80 w-full max-w-md lg:absolute lg:right-8 lg:bottom-2 lg:w-[26rem]">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-white/60 tracking-[0.18em]">Available right now</span>
              <span className="display text-4xl text-lime">{available.length}</span>
            </div>
            <ul className="mt-5 space-y-4">
              {courts.slice(0, 4).map((c) => (
                <li key={c.id} className="flex items-center gap-4">
                  <span className="w-10 h-10 rounded-full bg-white/10 grid place-items-center text-lg">🏸</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{c.name}</div>
                    <div className="text-sm text-white/55">{c.free_today} slot{c.free_today === 1 ? '' : 's'} left · till {fmtHour(c.close_hour)}</div>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${DOT[c.availability]}`} />
                </li>
              ))}
              {!data && <li className="text-white/50 text-sm">Loading live availability...</li>}
              {data?.offline && <li className="text-white/50 text-sm">Start the API server to see live courts.</li>}
            </ul>
          </aside>
        </div>
      </section>

      {/* ---------- STATS ---------- */}
      <section className="bg-[#0a1226] border-y border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/5">
          {[
            [stats.players, 'Students signed up'],
            [stats.courts, 'Courts on campus'],
            [stats.games_week, 'Bookings this week'],
            [stats.open_games, 'Open games to join'],
          ].map(([n, label]) => (
            <div key={label} className="px-6 sm:px-8 py-9">
              <div className="display text-5xl sm:text-6xl">{n ?? '–'}</div>
              <div className="text-white/55 mt-2">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- PICK YOUR COURT ---------- */}
      <section id="courts" className="bg-[#f4f6fb] text-[#0a1226] py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="display text-6xl sm:text-8xl">Pick your<br /><span className="text-brand italic">court.</span></h2>
            <p className="text-lg text-[#0a1226]/60 max-w-xs">Every court is bookable by the hour. One tap to lock your slot, zero double-bookings.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mt-14">
            {courts.map((c, i) => (
              <button
                key={c.id}
                onClick={() => onEnter('courts')}
                className={`relative text-left rounded-[1.75rem] overflow-hidden h-80 p-7 flex flex-col justify-end text-white group ${i === 0 ? 'md:col-span-2' : ''}`}
                style={{ background: ['linear-gradient(135deg,#06122e,#14398f 70%,#2f6bff)', 'linear-gradient(135deg,#071a14,#0e5a3a 80%,#2cc27a)', 'linear-gradient(135deg,#1a0a2a,#4b1e86 80%,#8b5cf6)'][i % 3] }}
              >
                <span className="absolute right-6 top-4 text-[7rem] opacity-25 group-hover:opacity-40 transition select-none">🏸</span>
                <svg className="absolute inset-0 w-full h-full opacity-[0.12]" viewBox="0 0 400 300" fill="none" stroke="#fff" strokeWidth="2" preserveAspectRatio="none">
                  <rect x="20" y="20" width="360" height="260" /><line x1="200" y1="20" x2="200" y2="280" strokeWidth="4" /><line x1="20" y1="150" x2="380" y2="150" /><line x1="110" y1="20" x2="110" y2="280" /><line x1="290" y1="20" x2="290" y2="280" />
                </svg>
                <div className="relative flex items-end justify-between">
                  <div>
                    <div className="display text-4xl sm:text-5xl">{c.name.replace('Badminton ', '')}</div>
                    <div className="text-white/75 mt-1">{c.location}</div>
                    <div className="text-white/60 text-sm mt-1">{c.free_today} slot{c.free_today === 1 ? '' : 's'} left today ·{fmtHour(c.open_hour)} to {fmtHour(c.close_hour)}</div>
                  </div>
                  <span className="w-14 h-14 rounded-full bg-lime text-black grid place-items-center text-2xl font-bold group-hover:rotate-45 transition">↗</span>
                </div>
              </button>
            ))}
            <div className="rounded-[1.75rem] h-80 p-7 flex flex-col justify-end border-2 border-dashed border-[#0a1226]/20 text-[#0a1226]/60">
              <div className="display text-3xl">More sports soon</div>
              <div className="mt-1">Basketball, football, tennis and more are on the roadmap.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- MAP ---------- */}
      <section className="bg-[#050b1a] py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[0.8fr_1.2fr] gap-10 items-center">
          <div>
            <div className="eyebrow text-lime">Live campus map</div>
            <h2 className="display text-6xl sm:text-7xl mt-5">Every court.<br />One map.</h2>
            <p className="text-lg text-white/60 mt-6">Tap a pin to see what's open and book in seconds.</p>
            {picked && (
              <div className="card p-6 mt-8 bg-panel/70">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-3xl">🏸</span>
                  <span className="inline-flex items-center gap-2 border border-white/15 rounded-full px-3 py-1.5 text-sm font-semibold">
                    <span className={`w-2.5 h-2.5 rounded-full ${DOT[picked.availability]}`} />{AVAIL_TEXT[picked.availability]}
                  </span>
                </div>
                <div className="display text-3xl mt-4">{picked.name}</div>
                <div className="text-white/55 mt-1">{picked.location}</div>
                <button onClick={() => onEnter('courts')} className="text-lime font-bold mt-5">Book this court →</button>
              </div>
            )}
          </div>

          <div className="relative aspect-[4/3] rounded-[1.75rem] border border-white/10 bg-[#0a1226] overflow-hidden">
            <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="absolute w-[110%] h-5 bg-white/10 -left-[5%] top-[52%] -rotate-[8deg]" />
            <div className="absolute w-5 h-[120%] bg-white/10 left-[22%] -top-[10%] rotate-[6deg]" />
            <div className="absolute left-[8%] top-[10%] w-[18%] h-[16%] rounded-xl border border-white/10 bg-white/[0.03]" />
            <div className="absolute left-[62%] top-[8%] w-[22%] h-[14%] rounded-xl border border-white/10 bg-white/[0.03]" />
            <div className="absolute left-[8%] top-[62%] w-[26%] h-[26%] rounded-[50%] bg-emerald-500/15" />
            <div className="absolute right-[6%] bottom-[8%] w-[22%] h-[24%] rounded-xl bg-brand/20" />
            <span className="absolute left-[40%] top-[8%] eyebrow text-white/35 text-[0.6rem]">Library</span>
            <span className="absolute left-[8%] top-[44%] eyebrow text-white/35 text-[0.6rem]">Academic block</span>
            <span className="absolute right-[6%] top-[44%] eyebrow text-white/35 text-[0.6rem]">Hostels</span>
            {courts.map((c, i) => {
              const p = PINS[i % PINS.length];
              const on = pin === i;
              return (
                <button key={c.id} onClick={() => setPin(i)} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                  <span className={`grid place-items-center rounded-full transition-all ${on ? 'w-16 h-16 bg-lime text-black pulse-ring text-2xl' : 'w-12 h-12 bg-panel2 border border-white/20 text-lg'}`}>🏸</span>
                  <span className={`absolute -right-0.5 -top-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a1226] ${DOT[c.availability]}`} />
                  {on && <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 whitespace-nowrap bg-lime text-black text-xs font-bold rounded-full px-3 py-1">{c.name}</span>}
                </button>
              );
            })}
            <span className="absolute left-4 bottom-4 eyebrow text-amber border border-amber/40 rounded-full px-3 py-1.5 text-[0.6rem]">Illustrative map</span>
          </div>
        </div>
      </section>

      {/* ---------- OPEN GAMES ---------- */}
      <section className="bg-[#070e1f] py-24 relative overflow-hidden">
        <span className="display absolute -top-4 right-0 text-[16rem] leading-none text-transparent opacity-30 select-none hidden md:block" style={{ WebkitTextStroke: '2px #2f6bff' }}>ALONE</span>
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="display text-6xl sm:text-8xl">Never play<br /><span className="text-lime">alone.</span></h2>
            <button onClick={() => onEnter('open')} className="btn-ghost px-6 py-3.5">See all open games →</button>
          </div>
          {games.length === 0 ? (
            <div className="card p-10 mt-12 text-center text-white/60">
              No open games yet. Book a court, tap <b className="text-white">Open to join</b>, and yours shows up here.
            </div>
          ) : (
            <div className="flex gap-5 mt-12 overflow-x-auto no-scrollbar pb-2">
              {games.map((g, i) => (
                <button key={g.id} onClick={() => onEnter('open')} className="card min-w-[270px] w-[270px] text-left overflow-hidden shrink-0 hover:border-lime/50 transition">
                  <div className="h-36 relative grid place-items-center text-6xl" style={{ background: ['linear-gradient(135deg,#0b2a6b,#2f6bff)', 'linear-gradient(135deg,#0b3b2a,#1fa971)', 'linear-gradient(135deg,#3a1170,#8b5cf6)', 'linear-gradient(135deg,#6b2a0b,#f97316)'][i % 4] }}>
                    🏸
                    <span className="absolute left-4 bottom-4 bg-lime text-black text-sm font-bold rounded-full px-3 py-1">{g.spots_left} spot{g.spots_left === 1 ? '' : 's'}</span>
                  </div>
                  <div className="p-5">
                    <div className="eyebrow text-white/50 tracking-[0.14em]">{dayLabel(g.date)} · {fmtHour(g.start_hour)}</div>
                    <div className="display text-2xl mt-2 leading-tight">{g.court_name}</div>
                    <div className="text-white/50 text-sm mt-3 capitalize">{g.skill_level} host</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div id="how" className="grid md:grid-cols-3 gap-10 mt-24">
            {[
              ['01', '📍', 'Find a court', 'See live availability across campus.'],
              ['02', '🤝', 'Match by skill', 'Open games show the host\'s level so you join the right game.'],
              ['03', '🔒', 'Lock it in', 'Book a slot, invite players, show up.'],
            ].map(([n, icon, title, text]) => (
              <div key={n} className="flex gap-5">
                <span className="display text-7xl text-lime/30">{n}</span>
                <div className="pt-2">
                  <div className="font-bold text-lg flex items-center gap-2"><span>{icon}</span>{title}</div>
                  <p className="text-white/55 mt-1">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-sm text-white/40">
        Court-to-Community · Campus sports booking prototype
      </footer>
    </div>
  );
}
