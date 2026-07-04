import React from 'react';
import { cn } from '../lib/utils';

interface WaytaLogoProps {
  className?: string;
  size?: number;
}

export const WaytaLogo: React.FC<WaytaLogoProps> = ({ 
  className, 
  size = 40
}) => {
  return (
    <img 
      src={`${import.meta.env.BASE_URL}oglogo.png`} 
      alt="Wayta Logo"
      className={cn("object-contain", className)}
      style={{ 
        width: size, 
        height: size, 
      }}
    />
  );
};
