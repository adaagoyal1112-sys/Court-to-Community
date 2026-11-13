import React, { useCallback, useEffect, useState } from 'react';
import { api, dayLabel, fmtHour } from '../api.js';

const STATUS = {
  confirmed: 'bg-lime/15 text-lime border-lime/40',
  completed: 'bg-white/10 text-white/70 border-white/15',
  no_show: 'bg-rose-500/15 text-rose-300 border-rose-400/40',
};
const REQ = {
  pending: 'bg-amber/15 text-amber border-amber/40',
  approved: 'bg-lime/15 text-lime border-lime/40',
  declined: 'bg-rose-500/15 text-rose-300 border-rose-400/40',
};
const chip = 'px-3 py-1 rounded-full text-xs font-bold border first-letter:uppercase';

export default function MyBookings({ notify, onAuthError }) {
  const [bookings, setBookings] = useState(null);
  const [sent, setSent] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [requests, setRequests] = useState([]);

  const fail = useCallback((err) => {
    if (err.status === 401) return onAuthError();
    notify(err.message, 'error');
  }, [notify, onAuthError]);

  const load = useCallback(() => {
    api('/bookings/mine').then(setBookings).catch(fail);
    api('/join-requests/mine').then(setSent).catch(fail);
  }, [fail]);
  useEffect(() => { load(); }, [load]);

  async function toggleOpen(b) {
    try {
      await api(`/bookings/${b.id}/open`, { method: 'PATCH', body: { isOpen: !b.is_open } });
      notify(b.is_open ? 'Closed to join requests.' : 'Open! Others can now ask to join.');
      load();
    } catch (err) { fail(err); }
  }

  async function cancel(b) {
    if (!window.confirm(`Cancel ${b.court_name} on ${b.date} at ${fmtHour(b.start_hour)}?`)) return;
    try {
      await api(`/bookings/${b.id}`, { method: 'DELETE' });
      notify('Booking cancelled. The slot is free again.');
      if (expanded === b.id) setExpanded(null);
      load();
    } catch (err) { fail(err); }
  }

  async function showRequests(b) {
    if (expanded === b.id) return setExpanded(null);
    try { setRequests(await api(`/bookings/${b.id}/requests`)); setExpanded(b.id); }
    catch (err) { fail(err); }
  }

  async function decide(reqId, status, bookingId) {
    try {
      await api(`/join-requests/${reqId}`, { method: 'PATCH', body: { status } });
      notify(status === 'approved' ? 'Player approved.' : 'Request declined.');
      setRequests(await api(`/bookings/${bookingId}/requests`));
      load();
    } catch (err) { fail(err); }
  }

  if (!bookings) return <p className="text-white/50">Loading...</p>;

  return (
    <div className="space-y-14">
      <section>
        <h1 className="display text-5xl sm:text-6xl">My <span className="text-lime">bookings.</span></h1>
        {bookings.length === 0 && <p className="text-white/55 mt-6">Nothing booked yet. Grab a free slot under Courts.</p>}
        <div className="space-y-4 mt-8">
          {bookings.map((b) => (
            <div key={b.id} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="eyebrow text-white/45 tracking-[0.14em]">{dayLabel(b.date)} · {fmtHour(b.start_hour)}</div>
                  <div className="display text-2xl mt-1.5">{b.court_name}</div>
                  <div className="text-sm text-white/45 mt-0.5">{b.date}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`${chip} ${STATUS[b.status] || ''}`}>{b.status.replace('_', ' ')}</span>
                  {b.is_open && <span className={`${chip} bg-brand/15 text-sky-300 border-brand/50`}>open to join</span>}
                  {b.status === 'confirmed' && (
                    <>
                      <button onClick={() => toggleOpen(b)} className="btn-ghost px-4 py-2 text-sm">{b.is_open ? 'Close to joiners' : 'Open to join'}</button>
                      <button onClick={() => showRequests(b)} className="btn-ghost px-4 py-2 text-sm">Requests{b.pending_requests > 0 ? ` (${b.pending_requests})` : ''}</button>
                      <button onClick={() => cancel(b)} className="px-4 py-2 text-sm rounded-full border border-rose-400/40 text-rose-300 hover:bg-rose-500/10 font-semibold">Cancel</button>
                    </>
                  )}
                </div>
              </div>

              {expanded === b.id && (
                <div className="mt-5 pt-5 border-t border-white/10">
                  {requests.length === 0 ? (
                    <p className="text-sm text-white/50">No join requests yet.{!b.is_open && ' Tap "Open to join" so others can ask.'}</p>
                  ) : (
                    <ul className="space-y-3">
                      {requests.map((r) => (
                        <li key={r.id} className="flex flex-wrap items-center justify-between gap-3">
                          <span className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-full bg-white/10 grid place-items-center font-bold">{r.name[0]}</span>
                            <span><b>{r.name}</b> <span className="text-white/45 text-sm capitalize">· {r.skill_level}</span></span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className={`${chip} ${REQ[r.status]}`}>{r.status}</span>
                            {r.status === 'pending' && (
                              <>
                                <button onClick={() => decide(r.id, 'approved', b.id)} className="btn-lime px-4 py-1.5 text-sm">Approve</button>
                                <button onClick={() => decide(r.id, 'declined', b.id)} className="btn-ghost px-4 py-1.5 text-sm">Decline</button>
                              </>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="display text-4xl">Games I asked to <span className="text-lime">join.</span></h2>
        {sent.length === 0 ? (
          <p className="text-white/55 mt-5">No requests sent. Browse Open Games to find people to play with.</p>
        ) : (
          <div className="space-y-3 mt-6">
            {sent.map((r) => (
              <div key={r.id} className="card px-5 py-4 flex items-center justify-between gap-3">
                <span><b>{r.court_name}</b> <span className="text-white/50">· {r.date} · {fmtHour(r.start_hour)}</span></span>
                <span className={`${chip} ${REQ[r.status]}`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
