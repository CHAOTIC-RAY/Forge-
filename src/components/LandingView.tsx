import React from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';

interface LandingViewProps {
  onLogin: () => void;
}

export function LandingView({ onLogin }: LandingViewProps) {
  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Subtle orange glow */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#bd3800]/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full z-10 flex flex-col">
        {/* Logo Area */}
        <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={onLogin}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C12 2 9 7 9 12C9 17 12 22 12 22" stroke="#bd3800" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 12L18 6" stroke="#bd3800" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-3xl font-bold tracking-tight">Forge</span>
        </div>

        {/* Headline */}
        <div className="flex flex-col mb-8 leading-[1.1]">
          <h1 className="text-[3.5rem] font-bold text-white tracking-tight">Sparks</h1>
          <h1 className="text-[3.5rem] font-bold text-[#757681] tracking-tight">into</h1>
          <div className="relative inline-block self-start">
            <h1 className="text-[3.5rem] font-bold text-[#2665fd] tracking-tight">substance.</h1>
            <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path d="M0 6C30 6 45 2 75 2C105 2 120 10 150 10C180 10 195 6 200 6" stroke="#F5A623" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Subheadline */}
        <p className="text-[#757681] text-lg leading-relaxed mb-16 max-w-[90%]">
          Capture endless ideas in your Creative Hub and transform them into a polished, high-performing social media strategy.
        </p>

        {/* Login Button */}
        <button 
          onClick={onLogin}
          className="bg-[#2665fd] text-white rounded-[8px] py-4 px-6 font-semibold text-lg mb-12 hover:bg-[#1e52d0] transition-colors"
        >
          Log In / Sign Up
        </button>

        {/* Footer Link */}
        <div className="flex flex-col items-center gap-2 mt-auto">
          <a href="#" onClick={(e) => { e.preventDefault(); onLogin(); }} className="text-[#757681] text-sm underline decoration-[#757681]/50 hover:text-white transition-colors">
            Having trouble logging in? Open app in a new tab
          </a>
          <ChevronDown className="w-5 h-5 text-[#757681]" />
        </div>
      </div>
    </div>
  );
}
