'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface StatItem {
  label: string
  value: string | number
  icon?: LucideIcon
  color?: string
}

interface StatCardProps {
  title: string
  stats: StatItem[]
  variant?: 'default' | 'highlight'
  delay?: number
}

export default function StatCard({
  title,
  stats,
  variant = 'default',
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1, ease: 'easeOut' }}
      className={`glass-card p-6 ${variant === 'highlight' ? 'border-[rgba(143,174,127,0.3)]' : ''}`}
    >
      <div className="flex items-center gap-3 mb-6">
        {variant === 'highlight' && (
          <div className="w-2 h-8 rounded-full bg-[#8fae7f]" />
        )}
        <h3 className="section-title">{title}</h3>
      </div>
      
      <div className="space-y-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: delay * 0.1 + index * 0.1 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {stat.icon && (
                <div 
                  className="p-2 rounded-lg"
                  style={{ 
                    background: stat.color ? `${stat.color}20` : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <stat.icon 
                    size={18} 
                    color={stat.color || 'rgba(255,255,255,0.6)'} 
                  />
                </div>
              )}
              <span className="text-sm font-medium text-white/70">{stat.label}</span>
            </div>
            <span className="text-lg font-bold text-white">{stat.value}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}