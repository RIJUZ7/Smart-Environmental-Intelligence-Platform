import React from 'react';

interface TopographicLogoProps {
  className?: string;
  size?: number;
}

export const TopographicLogo: React.FC<TopographicLogoProps> = ({ className = '', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="ECO-SENSE Field Observatory Symbol"
    >
      {/* Background soft earth disc */}
      <circle cx="24" cy="24" r="22" fill="#E5EBDD" stroke="#D9DCCF" strokeWidth="1.5" />

      {/* Topographic contour lines representing elevation & field transect */}
      <path
        d="M 12 30 C 16 26, 20 28, 24 25 C 28 22, 32 24, 36 20"
        stroke="#82966B"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M 10 24 C 15 20, 20 22, 25 18 C 30 14, 34 17, 38 14"
        stroke="#315C45"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M 14 36 C 18 32, 23 33, 27 30 C 31 27, 34 29, 37 26"
        stroke="#477D92"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />

      {/* Central Observatory focal sensor node */}
      <circle cx="25" cy="18" r="3" fill="#B78A4D" />
      <circle cx="25" cy="18" r="6" stroke="#B78A4D" strokeWidth="1" strokeDasharray="2 2" />

      {/* Outer orientation compass tick */}
      <line x1="24" y1="2" x2="24" y2="6" stroke="#315C45" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="42" x2="24" y2="46" stroke="#D9DCCF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="24" x2="6" y2="24" stroke="#D9DCCF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="42" y1="24" x2="46" y2="24" stroke="#D9DCCF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};
