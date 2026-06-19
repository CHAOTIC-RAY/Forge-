import { useEffect, useState } from 'react';

export type SidebarStyle = 'classic' | 'expanded' | 'island' | 'dock';

export function getSidebarStyle(): SidebarStyle {
  if (typeof document === 'undefined') return 'classic';
  return (document.documentElement.getAttribute('data-sidebar-style') as SidebarStyle) || 'classic';
}

/** Live-reads `data-sidebar-style` from the theme engine (Settings → Sidebar Style). */
export function useSidebarStyle(): SidebarStyle {
  const [sidebarStyle, setSidebarStyle] = useState<SidebarStyle>('classic');

  useEffect(() => {
    const update = () => setSidebarStyle(getSidebarStyle());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-sidebar-style'],
    });
    return () => observer.disconnect();
  }, []);

  return sidebarStyle;
}
