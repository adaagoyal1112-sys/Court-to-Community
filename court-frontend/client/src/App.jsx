import React, { useCallback, useEffect, useState } from 'react';
import { clearSession, getToken, getUser } from './api.js';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Courts from './pages/Courts.jsx';
import MyBookings from './pages/MyBookings.jsx';
import OpenGames from './pages/OpenGames.jsx';
import Logo from './components/Logo.jsx';
import Toast from './components/Toast.jsx';

const TABS = [
  { id: 'courts', label: 'Courts' },
  { id: 'open', label: 'Open Games' },
  { id: 'mine', label: 'My Bookings' },
];

export default function App() {
  const [user, setUser] = useState(getToken() ? getUser() : null);
  const [view, setView] = useState('landing'); // landing | auth | app
  const [tab, setTab] = useState('courts');
  const [after, setAfter] = useState('courts'); // tab to open after login
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, kind = 'ok') => setToast({ message, kind, id: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Landing page buttons call this: go straight to the app, or ask for login first.
  const enter = (target) => {
    if (user) { setTab(target); setView('app'); }
    else { setAfter(target); setView('auth'); }
  };
  const logout = () => { clearSession(); setUser(null); setView('landing'); };
  const onAuthError = useCallback(() => { clearSession(); setUser(null); setView('auth'); }, []);

  let page;
  if (view === 'auth' || (view === 'app' && !user)) {
    page = <Login onLogin={(u) => { setUser(u); setTab(after); setView('app'); }} onBack={() => setView('landing')} notify={notify} />;
  } else if (view === 'app') {
    page = (
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 bg-ink/85 backdrop-blur border-b border-white/10">
          <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
            <Logo onClick={() => setView('landing')} />
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden sm:inline text-white/60">Hi, <b className="text-white">{user.name}</b></span>
              <button onClick={logout} className="btn-ghost px-4 py-2">Log out</button>
            </div>
          </div>
          <nav className="max-w-6xl mx-auto px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${
                  tab === t.id ? 'bg-lime text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </header>
        <main className="max-w-6xl mx-auto px-5 py-8 pb-32">
          {tab === 'courts' && <Courts user={user} notify={notify} onAuthError={onAuthError} />}
          {tab === 'open' && <OpenGames user={user} notify={notify} onAuthError={onAuthError} />}
          {tab === 'mine' && <MyBookings notify={notify} onAuthError={onAuthError} />}
        </main>
      </div>
    );
  } else {
    page = <Landing user={user} onEnter={enter} onLogin={() => { setAfter('courts'); setView('auth'); }} />;
  }

  return (
    <>
      {page}
      <Toast toast={toast} />
    </>
  );
}
