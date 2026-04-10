import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface AutoSuggestProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
}

export function AutoSuggest({ value, onChange, options, placeholder, label, disabled, name, className }: AutoSuggestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredOptions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
          const opt = filteredOptions[selectedIndex];
          setInputValue(opt);
          onChange(opt);
          setIsOpen(false);
        } else if (inputValue) {
          onChange(inputValue);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {label && <label className="block text-sm font-medium text-[#757681] mb-1">{label}</label>}
      <div className="relative">
        <input
          type="text"
          name={name}
          value={inputValue}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] focus:ring-2 focus:ring-[#2665fd] focus:border-[#2665fd] outline-none transition-colors disabled:opacity-70"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDown className={cn("w-4 h-4 text-[#9B9A97] transition-transform", isOpen && "rotate-180")} />
        </div>
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[8px] max-h-48 overflow-y-auto py-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputValue(opt);
                  onChange(opt);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm transition-colors",
                  idx === selectedIndex 
                    ? "bg-[#2665fd]/10 text-[#2665fd]" 
                    : "hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED]"
                )}
              >
                {opt}
              </button>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-[#757681] italic">
              No matches found. Press Enter to use "{inputValue}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
