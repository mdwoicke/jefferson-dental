import React from 'react';

interface IOSCallButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

const IOSCallButton: React.FC<IOSCallButtonProps> = ({
  icon,
  label,
  onClick,
  isActive = false,
  disabled = false,
  variant = 'default',
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  // Base button styles
  const baseStyles = `
    flex flex-col items-center justify-center gap-1
    transition-all duration-200
    ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
  `;

  // Variant-specific styles
  const variantStyles = variant === 'danger'
    ? `
      w-18 h-18
      rounded-full
      bg-red-500
      hover:bg-red-600
      shadow-lg shadow-red-500/40
      ${!disabled && 'hover:scale-105 active:scale-95'}
    `
    : `
      w-18 h-18
      rounded-full
      ${isActive
        ? 'bg-white/90 text-black'
        : 'bg-white/15 text-white backdrop-blur-md'
      }
      ${!disabled && 'hover:bg-white/25 hover:scale-105 active:scale-95'}
    `;

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles}`}
      style={{
        width: '72px',
        height: '72px',
      }}
      aria-label={label}
    >
      <div className={variant === 'danger' ? 'w-7 h-7 text-white' : 'w-7 h-7'}>
        {icon}
      </div>
      <span
        className={`text-xs font-medium ${variant === 'danger' ? 'text-white' : ''}`}
        style={{ fontSize: '11px' }}
      >
        {label}
      </span>
    </button>
  );
};

export default IOSCallButton;
