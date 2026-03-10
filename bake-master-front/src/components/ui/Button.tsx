import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  className?: string;
}

const variantStyles = {
  primary: 'bg-bakery-500 text-white hover:bg-bakery-600 shadow-sm',
  secondary: 'bg-wheat-100 text-wheat-800 hover:bg-wheat-200',
  danger: 'bg-red-500 text-white hover:bg-red-600',
  ghost: 'text-gray-600 hover:bg-gray-100',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  className = ''
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition-all ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
