import { useState, useEffect } from 'react';

export interface Viewport {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    return { width: w, height: h, isMobile: w < 768, isTablet: w >= 768 && w < 1024, isDesktop: w >= 1024 };
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setViewport({ width: w, height: window.innerHeight, isMobile: w < 768, isTablet: w >= 768 && w < 1024, isDesktop: w >= 1024 });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewport;
}
