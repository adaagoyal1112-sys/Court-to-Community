import React from 'react';

export default function Toast({ toast }) {
  if (!toast) return null;
  const error = toast.kind === 'error';
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-[92vw] px-5 py-3 rounded-full text-sm font-semibold shadow-2xl border ${
        error ? 'bg-rose-600 border-rose-400/40 text-white' : 'bg-lime text-black border-lime'
      }`}
    >
      {toast.message}
    </div>
  );
}
