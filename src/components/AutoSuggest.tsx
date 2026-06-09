import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface AutoSuggestProps {
  name: string;
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}

export function AutoSuggest({
  name,
  label,
  value,
  disabled = false,
  onChange,
  options,
  placeholder,
}: AutoSuggestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
  };

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative w-full text-left">
      {label && (
        <label className="block text-[10px] font-black text-[#757681] dark:text-white/40 uppercase tracking-widest ml-1 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          name={name}
          type="text"
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full h-10 px-4 bg-[#F7F7F5] dark:bg-black/20 border border-[#E9E9E7] dark:border-white/10 rounded-[14px] text-sm outline-none focus:border-brand/70 focus:ring-4 focus:ring-brand/10 transition-all text-[#37352F] dark:text-[#EBE9ED] font-medium shadow-inner"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#757681] dark:text-white/40 hover:text-brand"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 mt-2 w-full max-h-48 overflow-y-auto rounded-[14px] border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] shadow-xl py-1.5 text-sm">
          {filteredOptions.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(opt)}
              className="w-full text-left px-4 py-2 hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] transition-colors font-medium"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export default AutoSuggest;
