import React, { useCallback, useEffect, useState } from 'react';
import { api, dayLabel, fmtHour } from '../api.js';

const GRADS = ['linear-gradient(135deg,#0b2a6b,#2f6bff)', 'linear-gradient(135deg,#0b3b2a,#1fa971)', 'linear-gradient(135deg,#3a1170,#8b5cf6)', 'linear-gradient(135deg,#6b2a0b,#f97316)'];

export default function OpenGames({ user, notify, onAuthError }) {
  const [slots, setSlots] = useState(null);

  const fail = useCallback((err) => {
    if (err.status === 401) return onAuthError();
    notify(err.message, 'error');
  }, [notify, onAuthError]);

  const load = useCallback(() => { api('/open-slots').then(setSlots).catch(fail); }, [fail]);
  useEffect(() => { load(); }, [load]);

  async function join(s) {
    try {
      await api(`/bookings/${s.id}/join`, { method: 'POST' });
      notify(`Request sent to ${s.host}. Track it in My Bookings.`);
    } catch (err) { fail(err); }
  }

  if (!slots) return <p className="text-white/50">Loading...</p>;

  return (
    <div>
      <h1 className="display text-5xl sm:text-6xl">Never play <span className="text-lime">alone.</span></h1>
      <p className="text-white/55 mt-3 mb-8">Students with a court booked who are looking for more players.</p>

      {slots.length === 0 && (
        <div className="card p-10 text-center text-white/60">No open games right now. Book a slot and tap <b className="text-white">Open to join</b> to start one.</div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {slots.map((s, i) => {
          const left = s.max_players - 1 - s.joined;
          const mine = s.host_id === user.id;
          return (
            <div key={s.id} className="card overflow-hidden flex flex-col">
              <div className="h-32 relative grid place-items-center text-5xl" style={{ background: GRADS[i % GRADS.length] }}>
                🏸
                <span className={`absolute left-4 bottom-3 text-sm font-bold rounded-full px-3 py-1 ${left > 0 ? 'bg-lime text-black' : 'bg-black/50 text-white'}`}>
                  {left > 0 ? `${left} spot${left === 1 ? '' : 's'}` : 'Full'}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="eyebrow text-white/50 tracking-[0.14em]">{dayLabel(s.date)} · {fmtHour(s.start_hour)}</div>
                <div className="display text-2xl mt-2">{s.court_name}</div>
                <div className="text-white/55 text-sm mt-2">Host: <b className="text-white">{mine ? 'You' : s.host}</b> · <span className="capitalize">{s.skill_level}</span></div>
                {!mine && (
                  <button disabled={left <= 0} onClick={() => join(s)} className="btn-lime w-full py-3 mt-5">Request to join →</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
