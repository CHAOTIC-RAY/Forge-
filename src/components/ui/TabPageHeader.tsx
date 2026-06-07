import React from 'react';

export function TabPageShell({ children, className }: any) {
  return <div className={`flex-1 flex flex-col ${className || ''}`}>{children}</div>;
}

export function TabPageHeader({ children, className }: any) {
  return <div className={`flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800 ${className || ''}`}>{children}</div>;
}

export function TabHeaderSegments({ children, className }: any) {
  return <div className={`flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl ${className || ''}`}>{children}</div>;
}

export function TabPageContent({ children, className }: any) {
  return <div className={`flex-1 overflow-auto p-6 ${className || ''}`}>{children}</div>;
}
