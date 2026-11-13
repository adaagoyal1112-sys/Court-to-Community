import React, { useState } from 'react';
import { api, saveSession } from '../api.js';
import Logo from '../components/Logo.jsx';

export default function Login({
  onLogin,
  onBack,
  notify,
  initialMode = 'login'
}) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', email: '', password: '', skill_level: 'beginner' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = mode === 'login' ? { email: form.email, password: form.password } : form;
      const data = await api(mode === 'login' ? '/auth/login' : '/auth/signup', { method: 'POST', body });
      saveSession(data.token, data.user);
      onLogin(data.user);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,rgba(47,107,255,0.28),transparent_55%),radial-gradient(ellipse_at_0%_100%,rgba(182,242,58,0.16),transparent_50%)]" />
      <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className="relative max-w-6xl mx-auto px-5 py-6 flex items-center justify-between">
        <Logo onClick={onBack} />
        <button onClick={onBack} className="btn-ghost px-5 py-2.5 text-sm">← Back</button>
      </div>

      <div className="relative max-w-6xl mx-auto px-5 py-10 grid lg:grid-cols-2 gap-12 items-center">
        <div className="hidden lg:block">
          <div className="eyebrow text-lime">Campus badminton</div>
          <h1 className="display text-7xl xl:text-8xl mt-5">Book it.<br />Play it.<br /><span className="text-lime">Share it.</span></h1>
          <p className="text-xl text-white/65 mt-6 max-w-md">One verified campus login. Conflict-free court booking and an easy way to find players for your game.</p>
        </div>

        <div className="card p-8 sm:p-10 bg-panel/80 backdrop-blur w-full max-w-md lg:justify-self-end">
          <div className="flex bg-white/5 rounded-full p-1 mb-7 text-sm font-bold">
            {['login', 'signup'].map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2.5 rounded-full transition ${mode === m ? 'bg-lime text-black' : 'text-white/60'}`}>
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>
          <h2 className="display text-4xl mb-1">{mode === 'login' ? 'Welcome back.' : 'Join the game.'}</h2>
          <p className="text-white/50 text-sm mb-6">Only @thapar.edu email addresses can sign up.</p>

          <form onSubmit={submit} className="space-y-3.5">
            {mode === 'signup' && <input className="field" placeholder="Full name" value={form.name} onChange={set('name')} required />}
            <input className="field" type="email" placeholder="College email (@thapar.edu)" value={form.email} onChange={set('email')} required />
            <input className="field" type="password" placeholder="Password (min 6 characters)" value={form.password} onChange={set('password')} required />
            {mode === 'signup' && (
              <label className="block text-sm text-white/55">
                Skill level
                <select className="field mt-1.5" value={form.skill_level} onChange={set('skill_level')}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
            )}
            <button disabled={busy} className="btn-lime w-full py-3.5 text-lg mt-2">
              {busy ? 'Please wait...' : mode === 'login' ? 'Log in →' : 'Create account →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
