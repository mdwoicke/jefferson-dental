import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface IPhoneFrameProps {
  children: React.ReactNode;
  className?: string;
}

const IPhoneFrame: React.FC<IPhoneFrameProps> = ({ children, className = '' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`iphone-frame-wrapper ${className}`}>
      {/* iPhone Device Frame */}
      <div
        className="relative mx-auto"
        style={{
          width: '324px',
          height: '702px',
          background: isDark
            ? 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)'
            : 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          borderRadius: '45px',
          padding: '7px',
          boxShadow: `
            0 25px 50px rgba(0, 0, 0, 0.3),
            0 10px 25px rgba(0, 0, 0, 0.2),
            inset 0 0 0 2px rgba(255, 255, 255, 0.1)
          `,
        }}
      >
        {/* Screen Area */}
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            background: '#000',
            borderRadius: '38px',
          }}
        >
          {/* Dynamic Island */}
          <div
            className="absolute z-10"
            style={{
              top: '11px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '113px',
              height: '33px',
              background: '#000',
              borderRadius: '18px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6)',
            }}
          >
            {/* Subtle camera/sensor indicators */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-900"></div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-900"></div>
          </div>

          {/* Screen Content */}
          <div className="relative w-full h-full">
            {children}
          </div>
        </div>

        {/* Volume Buttons (Left Side) */}
        <div className="absolute left-0 top-[108px] w-1 h-7 bg-gray-800 rounded-l-sm opacity-60"></div>
        <div className="absolute left-0 top-[148px] w-1 h-11 bg-gray-800 rounded-l-sm opacity-60"></div>
        <div className="absolute left-0 top-[175px] w-1 h-11 bg-gray-800 rounded-l-sm opacity-60"></div>

        {/* Power Button (Right Side) */}
        <div className="absolute right-0 top-[148px] w-1 h-14 bg-gray-800 rounded-r-sm opacity-60"></div>
      </div>

      <style jsx>{`
        @keyframes iphone-scale-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .iphone-frame-wrapper {
          animation: iphone-scale-in 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
      `}</style>
    </div>
  );
};

export default IPhoneFrame;
