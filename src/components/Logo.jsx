import React from 'react';

export default function Logo({ className = '', size = 'md' }) {
  // Map sizes to Tailwind height classes to keep the logo proportions intact
  const sizeMap = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-24',
    '2xl': 'h-32'
  };

  const heightClass = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src="/rakshanav-logo.png" 
        alt="RakshaNav" 
        className={`${heightClass} w-auto object-contain drop-shadow-sm`}
        draggable="false"
      />
    </div>
  );
}
