'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface GaugeProps {
  value: number
  max: number
  label: string
  unit?: string
  icon?: LucideIcon
  color?: 'green' | 'ocean' | 'sand' | 'terracotta'
  size?: 'sm' | 'md' | 'lg'
  showPercentage?: boolean
  delay?: number
}

const colorMap = {
  green: '#8fae7f',
  ocean: '#5a8ba8',
  sand: '#d4c8b8',
  terracotta: '#c4704a',
}

const sizeMap = {
  sm: { size: 80, stroke: 6, fontSize: 'text-xl' },
  md: { size: 120, stroke: 8, fontSize: 'text-3xl' },
  lg: { size: 160, stroke: 10, fontSize: 'text-4xl' },
}

const sizeMapMobile = {
  sm: { size: 60, stroke: 5, fontSize: 'text-lg' },
  md: { size: 80, stroke: 6, fontSize: 'text-2xl' },
  lg: { size: 100, stroke: 7, fontSize: 'text-3xl' },
}

export default function Gauge({
  value,
  max,
  label,
  unit,
  icon: Icon,
  color = 'green',
  size = 'md',
  showPercentage = true,
  delay = 0,
}: GaugeProps) {
  const percentage = Math.min((value / max) * 100, 100)
  const strokeDasharray = 2 * Math.PI * 45
  const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray
  
  const colors = colorMap[color]
  const sizes = sizeMap[size]
  const mobileSizes = sizeMapMobile[size]
  const radius = 45

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: delay * 0.1, ease: 'easeOut' }}
      className="flex flex-col items-center"
    >
      <div className="relative md:w-[120px] lg:w-auto" style={{ width: mobileSizes.size, height: mobileSizes.size }} data-md-width={sizes.size}>
        <svg
          width={mobileSizes.size}
          height={mobileSizes.size}
          viewBox={`0 0 100 100`}
        >
          <defs>
            <linearGradient id={`gauge-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors} />
              <stop offset="100%" stopColor={colors} stopOpacity="0.4" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={mobileSizes.stroke}
          />
          
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={`url(#gauge-${color})`}
            strokeWidth={mobileSizes.stroke}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            initial={{ strokeDashoffset: strokeDasharray }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, delay: delay * 0.1, ease: 'easeOut' }}
            filter="url(#glow)"
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {Icon && <Icon size={mobileSizes.size * 0.2} color={colors} />}
          {showPercentage && (
            <span className={`font-bold text-white/90 ${mobileSizes.fontSize}`}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      </div>
      
      <div className="mt-2 md:mt-3 text-center">
        <p className="text-xs md:text-sm font-semibold text-white/70">{label}</p>
        {unit && (
          <p className="text-[10px] md:text-xs text-white/40 mt-0.5 md:mt-1 hidden sm:block">
            {value} / {max} {unit}
          </p>
        )}
      </div>
    </motion.div>
  )
}