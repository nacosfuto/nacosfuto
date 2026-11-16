import React from 'react';

/**
 * VerifiedCheckmark
 * Official "blue tick" verified badge icon styled in the election brand color (default #138601).
 */
export default function VerifiedCheckmark({ 
  className = "w-5 h-5", 
  color = "#138601",
  checkColor = "#ffffff" 
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 12-point scalloped verified badge body */}
      <path
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.63 9.33 1.75 10.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
        fill={color}
      />
      {/* Inner white checkmark */}
      <path
        d="M7.2 12.4l3.1 3.1 6.5-6.5"
        stroke={checkColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
