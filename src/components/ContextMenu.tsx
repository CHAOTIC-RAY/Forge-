import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children?: React.ReactNode;
  className?: string;
  x?: number;
  y?: number;
  isOpen?: boolean;
  onClose?: () => void;
  key?: React.Key;
}

export function ContextMenu({ items, children, className, x, y, isOpen: controlledIsOpen, onClose }: ContextMenuProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (isControlled) return;
    
    // Disable context menu on mobile/touch devices to prevent interference with long-press drag
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;

    e.preventDefault();
    e.stopPropagation();
    setInternalIsOpen(true);
    setPosition({ x: e.clientX, y: e.clientY });
  }, [isControlled]);

  useEffect(() => {
    if (isControlled && x !== undefined && y !== undefined) {
      setPosition({ x, y });
    }
  }, [isControlled, x, y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        if (isControlled) {
          onClose?.();
        } else {
          setInternalIsOpen(false);
        }
      }
    };

    const handleScroll = () => {
      if (isControlled) {
        onClose?.();
      } else {
        setInternalIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, isControlled, onClose]);

  // Adjust position if menu goes off screen
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = position.x;
      let newY = position.y;

      if (position.x + menuRect.width > viewportWidth) {
        newX = viewportWidth - menuRect.width - 10;
      }
      if (position.y + menuRect.height > viewportHeight) {
        newY = viewportHeight - menuRect.height - 10;
      }

      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY });
      }
    }
  }, [isOpen, position.x, position.y]);

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          style={{ 
            position: 'fixed', 
            top: position.y, 
            left: position.x,
            zIndex: 9999
          }}
          className="min-w-[180px] bg-white dark:bg-[#1E1E1E] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px]  py-1.5 overflow-hidden"
        >
          {items.map((item, index) => (
            <button
              key={index}
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
                if (isControlled) {
                  onClose?.();
                } else {
                  setInternalIsOpen(false);
                }
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-xs font-bold transition-colors text-left",
                item.variant === 'danger' 
                  ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10" 
                  : "text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E]",
                item.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <span className="flex-1">{item.label}</span>
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (isControlled) {
    return menuContent;
  }

  return (
    <div onContextMenu={handleContextMenu} className={cn("relative", className)}>
      {children}
      {menuContent}
    </div>
  );
}
