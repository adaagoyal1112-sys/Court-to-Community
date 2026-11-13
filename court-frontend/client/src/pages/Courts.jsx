import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, fmtHour, toDateStr } from '../api.js';

export default function Courts({ user, notify, onAuthError }) {
  const [courts, setCourts] = useState([]);
  const [courtId, setCourtId] = useState(null);
  const [date, setDate] = useState(toDateStr());
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return { value: toDateStr(d), dow: d.toLocaleDateString('en-US', { weekday: 'short' }), num: d.getDate(), mon: d.toLocaleDateString('en-US', { month: 'short' }) };
  }), []);

  const fail = useCallback((err) => {
    if (err.status === 401) return onAuthError();
    notify(err.message, 'error');
  }, [notify, onAuthError]);

  useEffect(() => {
    api('/courts').then((c) => { setCourts(c); if (c[0]) setCourtId(c[0].id); }).catch(fail);
  }, [fail]);

  const loadSlots = useCallback(() => {
    if (!courtId) return Promise.resolve();
    return api(`/courts/${courtId}/slots?date=${date}`).then(setData).catch(fail);
  }, [courtId, date, fail]);

  useEffect(() => { setSelected(null); loadSlots(); }, [loadSlots]);

  const nowHour = new Date().getHours();
  const isPast = (h) => date < toDateStr() || (date === toDateStr() && h <= nowHour);

  async function book(slot) {
    setBusy(true);
    try {
      await api('/bookings', { method: 'POST', body: { courtId, date, hour: slot.hour } });
      notify(`Booked ${data.court.name} at ${fmtHour(slot.hour)}. See My Bookings.`);
    } catch (err) {
      if (err.status === 409) notify('Sorry, someone just took that slot.', 'error');
      else fail(err);
    } finally { setBusy(false); setSelected(null); loadSlots(); }
  }

  async function join(slot) {
    setBusy(true);
    try {
      await api(`/bookings/${slot.booking_id}/join`, { method: 'POST' });
      notify('Join request sent. The host will approve or decline.');
    } catch (err) { fail(err); }
    finally { setBusy(false); setSelected(null); loadSlots(); }
  }

  const clickable = (s) => !isPast(s.hour) && (s.status === 'free' || (s.status === 'open' && s.booked_by_id !== user.id && s.spots_left > 0));

  function style(s) {
    const mine = s.booked_by_id === user.id ? ' ring-2 ring-lime' : '';
    if (isPast(s.hour)) return 'bg-white/[0.03] border-white/5 text-white/25 cursor-not-allowed';
    if (s.status === 'free') return 'bg-lime/10 border-lime/40 text-lime hover:bg-lime/20 hover:-translate-y-0.5';
    if (s.status === 'open') return 'bg-brand/15 border-brand/50 text-sky-300 hover:bg-brand/25 hover:-translate-y-0.5' + mine;
    return 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed' + mine;
  }

  const label = (s) => {
    if (isPast(s.hour)) return s.status === 'free' ? 'Passed' : 'Booked';
    if (s.status === 'free') return 'Free';
    const who = s.booked_by_id === user.id ? 'You' : s.booked_by;
    if (s.status === 'open') return `Open · ${s.spots_left} spot${s.spots_left === 1 ? '' : 's'} · ${who}`;
    return `Booked · ${who}`;
  };

  return (
    <div>
      <h1 className="display text-5xl sm:text-6xl">Pick your <span className="text-lime">slot.</span></h1>
      <p className="text-white/55 mt-3">Choose a court and a day, then tap a free hour.</p>

      <div className="flex flex-wrap gap-2.5 mt-8">
        {courts.map((c) => (
          <button key={c.id} onClick={() => setCourtId(c.id)}
            className={`px-5 py-2.5 rounded-full text-sm font-bold border transition ${courtId === c.id ? 'bg-white text-black border-white' : 'border-white/15 bg-white/5 text-white/75 hover:bg-white/10'}`}>
            🏸 {c.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2.5 overflow-x-auto no-scrollbar mt-5 pb-1">
        {days.map((d, i) => (
          <button key={d.value} onClick={() => setDate(d.value)}
            className={`shrink-0 w-16 py-3 rounded-2xl border text-center transition ${date === d.value ? 'bg-lime text-black border-lime' : 'border-white/10 bg-white/[0.04] hover:bg-white/10'}`}>
            <div className="text-[0.65rem] font-bold uppercase tracking-widest opacity-70">{i === 0 ? 'Today' : d.dow}</div>
            <div className="display text-2xl mt-0.5">{d.num}</div>
            <div className="text-[0.65rem] opacity-60">{d.mon}</div>
          </button>
        ))}
      </div>

      {data && (
        <p className="text-sm text-white/50 mt-6">
          {data.court.name} · {data.court.location} · {fmtHour(data.court.open_hour)} to {fmtHour(data.court.close_hour)}
        </p>
      )}

      <div className="flex flex-wrap gap-5 text-xs text-white/60 mt-4 mb-5">
        <Legend dot="bg-lime" text="Free" />
        <Legend dot="bg-white/30" text="Booked" />
        <Legend dot="bg-brand" text="Open to join" />
        <Legend dot="ring-2 ring-lime bg-transparent" text="Your booking" />
      </div>

      {!data ? (
        <p className="text-white/50">Loading slots...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.slots.map((s) => (
            <button key={s.hour} disabled={!clickable(s)} onClick={() => setSelected(s)}
              className={`border rounded-2xl px-4 py-4 text-left transition ${style(s)} ${selected?.hour === s.hour ? 'outline-2 outline-white' : ''}`}>
              <div className="display text-2xl">{fmtHour(s.hour)}</div>
              <div className="text-xs mt-1.5 font-semibold truncate">{label(s)}</div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-panel border-t border-white/15 shadow-[0_-20px_60px_rgba(0,0,0,0.6)]">
          <div className="max-w-6xl mx-auto px-5 py-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="eyebrow text-lime">{selected.status === 'free' ? 'Confirm booking' : 'Request to join'}</div>
              <div className="display text-2xl mt-1">{data.court.name} · {fmtHour(selected.hour)}</div>
              <div className="text-sm text-white/55">{date}{selected.status !== 'free' && ` · hosted by ${selected.booked_by}`}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSelected(null)} className="btn-ghost px-6 py-3">Cancel</button>
              <button disabled={busy} onClick={() => (selected.status === 'free' ? book(selected) : join(selected))} className="btn-lime px-7 py-3">
                {selected.status === 'free' ? 'Book it →' : 'Ask to join →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ dot, text }) {
  return <span className="flex items-center gap-2"><span className={`inline-block w-3 h-3 rounded-full ${dot}`} />{text}</span>;
}
