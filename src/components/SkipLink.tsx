import React from 'react';

export function SkipLink() {
  return (
    <a 
      href="#main-content" 
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-[#2665fd] text-white font-bold text-xs px-4 py-2 rounded-xl z-[9999] shadow-md border border-blue-400 focus:outline-none"
    >
      Skip to main content
    </a>
  );
}
export default SkipLink;
