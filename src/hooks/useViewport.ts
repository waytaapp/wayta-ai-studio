import { useState, useEffect } from 'react';

export interface Viewport {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  orientation: 'portrait' | 'landscape';
}

export const useViewport = (): Viewport => {
  const [viewport, setViewport] = useState<Viewport>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        isMobile: false,
        isTablet: false,
        isLandscape: true,
        isPortrait: false,
        orientation: 'landscape',
      };
    }
    
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isLand = w > h;
    
    return {
      width: w,
      height: h,
      isMobile: w < 768,
      isTablet: w >= 768 && w < 1024,
      isLandscape: isLand,
      isPortrait: !isLand,
      orientation: isLand ? 'landscape' : 'portrait',
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isLand = w > h;
      
      setViewport({
        width: w,
        height: h,
        isMobile: w < 768,
        isTablet: w >= 768 && w < 1024,
        isLandscape: isLand,
        isPortrait: !isLand,
        orientation: isLand ? 'landscape' : 'portrait',
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    
    // Also listen to orientationchange for legacy fallback browser support
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return viewport;
};
