import React from 'react';

export function HeroHandwritingTitle({ text, className }: any) {
  return (
    <span className={`font-serif italic text-[#2665fd] ${className || ''}`}>
      {text}
    </span>
  );
}
export default HeroHandwritingTitle;
