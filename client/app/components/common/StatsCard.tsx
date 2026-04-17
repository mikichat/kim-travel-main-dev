'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { type ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

const variantStyles = {
  default: 'bg-white border-gray-200',
  success: 'bg-green-50 border-green-200',
  warning: 'bg-orange-50 border-orange-200',
  danger: 'bg-red-50 border-red-200',
};

const iconStyles = {
  default: 'text-blue-600 bg-blue-100',
  success: 'text-green-600 bg-green-100',
  warning: 'text-orange-600 bg-orange-100',
  danger: 'text-red-600 bg-red-100',
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  variant = 'default',
  onClick,
}: StatsCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div
      className={`stats-card p-4 rounded-xl border ${variantStyles[variant]} ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`p-2 rounded-lg ${iconStyles[variant]}`}>
            {icon}
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${
          trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
        }`}>
          <TrendIcon className="w-3 h-3" />
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}

export default StatsCard;
