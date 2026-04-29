'use client'

import { motion } from 'framer-motion'
import { LucideIcon, CheckCircle2, Circle } from 'lucide-react'

interface ListItem {
  id: string
  title: string
  subtitle?: string
  checked?: boolean
  urgent?: boolean
  color?: string
}

interface ListCardProps {
  title: string
  items: ListItem[]
  icon?: LucideIcon
  onToggle?: (id: string) => void
  delay?: number
}

export default function ListCard({
  title,
  items,
  icon: Icon,
  onToggle,
  delay = 0,
}: ListCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1, ease: 'easeOut' }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        {Icon && (
          <div className="p-2 rounded-xl bg-[rgba(90,139,168,0.15)]">
            <Icon size={20} color="#5a8ba8" />
          </div>
        )}
        <h3 className="section-title">{title}</h3>
      </div>
      
      <div className="space-y-3">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: delay * 0.1 + index * 0.05 }}
            className={`flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer ${
              item.checked 
                ? 'bg-white/5 opacity-60' 
                : 'bg-white/5 hover:bg-white/10'
            }`}
            onClick={() => onToggle?.(item.id)}
          >
            <div className={`transition-colors ${item.checked ? 'text-[#8fae7f]' : 'text-white/30'}`}>
              {item.checked ? (
                <CheckCircle2 size={22} />
              ) : (
                <Circle size={22} />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate ${item.checked ? 'line-through text-white/50' : 'text-white'}`}>
                {item.title}
              </p>
              {item.subtitle && (
                <p className="text-sm text-white/50 mt-0.5">{item.subtitle}</p>
              )}
            </div>
            
            {item.urgent && !item.checked && (
              <span className="badge badge-danger text-xs">Urgente</span>
            )}
            {item.color && (
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            )}
          </motion.div>
        ))}
      </div>
      
      {items.length === 0 && (
        <div className="text-center py-8 text-white/40">
          <p>No hay elementos</p>
        </div>
      )}
    </motion.div>
  )
}