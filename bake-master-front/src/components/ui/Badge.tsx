interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'bread' | 'pastry' | 'beverage';
  size?: 'sm' | 'md';
}

const variantStyles = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  bread: 'bg-wheat-100 text-wheat-700',
  pastry: 'bg-pink-100 text-pink-700',
  beverage: 'bg-blue-100 text-blue-700',
};

export default function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variantStyles[variant]} ${sizeClass}`}>
      {children}
    </span>
  );
}
