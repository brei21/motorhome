'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  icon: LucideIcon
  color?: 'blue' | 'yellow' | 'orange'
  onClick?: () => void
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-500',
    accent: 'bg-blue-500',
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-500',
    accent: 'bg-yellow-500',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-500',
    accent: 'bg-orange-500',
  },
}

export default function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  color = 'blue',
  onClick,
}: MetricCardProps) {
  const colors = colorMap[color]

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-card border border-motor-border bg-white p-5 cursor-pointer",
        "transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5",
        "active:translate-y-0 active:scale-[0.98]"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-motor-text-secondary mb-2">
            {title}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-motor-text tracking-tight">
              {value}
            </span>
            {unit && (
              <span className="text-base font-medium text-motor-text-disabled">
                {unit}
              </span>
            )}
          </div>
        </div>
        <div className={cn("p-3 rounded-xl", colors.bg)}>
          <Icon size={24} className={colors.icon} />
        </div>
      </div>
      <div className={cn("h-1 mt-4 rounded-full", colors.accent)} />
    </div>
  )
}