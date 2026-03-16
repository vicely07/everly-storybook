import React from 'react';

interface EverlyBirdProps {
  size?: number;
  className?: string;
  talking?: boolean;
}

export const EverlyBird: React.FC<EverlyBirdProps> = ({ size = 64, className = '', talking = false }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible"
        style={{ transformOrigin: 'center' }}
      >
        <defs>
          {/* 1. Primary Orange Gradient - Deep and Rich */}
          <radialGradient id="tealGradient" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.9" /> {/* Orange-400 */}
            <stop offset="60%" stopColor="#ea580c" stopOpacity="0.6" /> {/* Orange-600 */}
            <stop offset="100%" stopColor="#c2410c" stopOpacity="0" />   {/* Orange-700 */}
          </radialGradient>
          
          {/* 2. Secondary Amber Gradient - Replaces Emerald/Violet */}
          <radialGradient id="violetGradient" cx="50%" cy="50%" r="50%" fx="70%" fy="70%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" /> {/* Amber-400 */}
            <stop offset="60%" stopColor="#d97706" stopOpacity="0.6" /> {/* Amber-600 */}
            <stop offset="100%" stopColor="#78350f" stopOpacity="0" />   {/* Amber-900 */}
          </radialGradient>

          {/* 3. Core Brightness */}
          <radialGradient id="coreLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="40%" stopColor="#ffedd5" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
          </radialGradient>

          {/* Stronger Glow Filter */}
          <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/> 
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* LAYER 1: Large Teal Blob (Clockwise) */}
        <g className="animate-spin-slow" style={{ transformOrigin: '50px 50px', animationDuration: '5s', mixBlendMode: 'screen' }}>
           <path 
             d="M50 5 C 80 5, 95 30, 95 50 C 95 80, 70 95, 50 95 C 20 95, 5 70, 5 50 C 5 20, 30 5, 50 5 Z" 
             fill="url(#tealGradient)" 
             transform="scale(1, 0.9)" 
           />
        </g>

        {/* LAYER 2: Violet Blob (Counter-Clockwise) */}
        <g className="animate-spin-reverse-slow" style={{ transformOrigin: '50px 50px', animationDuration: '7s', mixBlendMode: 'screen' }}>
           <path 
             d="M50 10 C 75 10, 90 35, 90 50 C 90 75, 65 90, 50 90 C 25 90, 10 65, 10 50 C 10 35, 35 10, 50 10 Z" 
             fill="url(#violetGradient)" 
             transform="rotate(135 50 50) scale(0.9, 1)" 
           />
        </g>
        
        {/* LAYER 3: Inner Pulse (Breathing) */}
        <circle cx="50" cy="50" r="32" fill="url(#tealGradient)" className="animate-breathe" style={{ transformOrigin: '50px 50px', mixBlendMode: 'overlay' }} />

        {/* TALKING STATE: Strong Vibrant Ripples */}
        {talking && (
          <g style={{ transformOrigin: '50px 50px' }}>
            <circle cx="50" cy="50" r="20" stroke="#fb923c" strokeWidth="4" fill="none" opacity="0.9">
               <animate attributeName="r" from="20" to="85" dur="1.2s" repeatCount="indefinite" />
               <animate attributeName="opacity" from="0.9" to="0" dur="1.2s" repeatCount="indefinite" />
               <animate attributeName="stroke-width" from="4" to="0" dur="1.2s" repeatCount="indefinite" />
            </circle>
             <circle cx="50" cy="50" r="20" stroke="#fbbf24" strokeWidth="3" fill="none" opacity="0.7">
               <animate attributeName="r" from="20" to="85" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
               <animate attributeName="opacity" from="0.7" to="0" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* CORE: The "Voice" itself - Bright and Glowing */}
        <g className={talking ? "animate-pulse" : "animate-pulse-slow"} style={{ transformOrigin: '50px 50px' }}>
            <circle cx="50" cy="50" r="14" fill="url(#coreLight)" filter="url(#strongGlow)" />
            <circle cx="50" cy="50" r="8" fill="#fff" />
        </g>

      </svg>
    </div>
  );
};