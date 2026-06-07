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
      <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1 font-sans uppercase tracking-wider">
        {label}
      </label>
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
          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 text-gray-905 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#2665fd]"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg py-1 text-xs">
          {filteredOptions.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(opt)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200"
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
