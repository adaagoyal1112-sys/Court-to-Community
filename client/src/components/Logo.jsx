import React from 'react';

export default function Logo({ onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 text-left">
      <span className="w-10 h-10 rounded-full bg-lime text-black grid place-items-center font-display font-black text-xl">C</span>
      <span className="display text-base sm:text-2xl uppercase">Court<span className="text-lime">2</span>Community</span>
    </button>
  );
}
