'use client'

import { LucideIcon } from 'lucide-react'

interface QuickAction {
  id: string
  label: string
  icon: LucideIcon
  onClick: () => void
}

interface QuickActionsProps {
  actions: QuickAction[]
}

export default function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.id}
            onClick={action.onClick}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-card border border-motor-border bg-white hover:bg-gray-50 hover:shadow-card-hover transition-all duration-200 active:scale-[0.98]"
          >
            <Icon size={24} className="text-motor-blue" />
            <span className="text-xs font-medium text-motor-text-secondary text-center">
              {action.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}