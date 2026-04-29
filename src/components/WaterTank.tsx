'use client'

import { Droplets, Waves, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TankLevel {
  label: string
  percentage: number
  icon: React.ComponentType<{ size?: number }>
  colorClass: string
}

interface WaterTankDisplayProps {
  freshWater?: number
  grayWater?: number
  blackWater?: number
}

export default function WaterTankDisplay({
  freshWater = 75,
  grayWater = 40,
  blackWater = 20,
}: WaterTankDisplayProps) {
  const tanks: TankLevel[] = [
    { label: 'Agua Limpia', percentage: freshWater, icon: Droplets, colorClass: 'bg-blue-500' },
    { label: 'Agua Gris', percentage: grayWater, icon: Waves, colorClass: 'bg-gray-400' },
    { label: 'Agua Negra', percentage: blackWater, icon: Trash2, colorClass: 'bg-gray-700' },
  ]

  const getStatusColor = (percentage: number, isBlack: boolean = false) => {
    if (isBlack) {
      if (percentage > 80) return 'bg-red-500'
      if (percentage > 50) return 'bg-yellow-500'
      return 'bg-gray-700'
    }
    if (percentage > 70) return 'bg-green-500'
    if (percentage > 30) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="rounded-card border border-motor-border bg-white p-5">
      <h3 className="text-sm font-semibold text-motor-text mb-4">Tanques de Agua</h3>
      <div className="space-y-4">
        {tanks.map((tank) => (
          <div key={tank.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <tank.icon size={16} />
                <span className="text-sm text-motor-text">{tank.label}</span>
              </div>
              <span className="text-sm font-medium text-motor-text-secondary">
                {tank.percentage}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  tank.label === 'Agua Negra' 
                    ? getStatusColor(tank.percentage, true)
                    : getStatusColor(tank.percentage)
                )}
                style={{ width: `${tank.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}