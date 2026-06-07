import React from 'react';

export function ContextMenu({ children }: any) {
  return <div className="relative">{children}</div>;
}

export function ContextMenuItem({ children, onClick }: any) {
  return (
    <button 
      type="button" 
      onClick={onClick} 
      className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-800 text-xs text-gray-700 dark:text-zinc-200"
    >
      {children}
    </button>
  );
}

export default ContextMenu;
