'use client'

import { motion } from 'framer-motion'

export default function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section Skeleton */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card p-6 mb-6 relative overflow-hidden"
        style={{ minHeight: '400px' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#5c7c5c]/10 to-[#2d4a5e]/10" />
        
        <div className="relative z-10 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="w-24 h-7 rounded-full bg-white/10 animate-pulse" />
            <div className="w-40 h-5 rounded bg-white/5 animate-pulse" />
          </div>
          
          <div className="flex-1 rounded-xl overflow-hidden mb-4 bg-white/5 animate-pulse" style={{ minHeight: '280px' }}>
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
            </div>
          </div>
          
          <div className="flex items-end justify-between">
            <div>
              <div className="w-48 h-9 rounded bg-white/10 animate-pulse mb-2" />
              <div className="w-32 h-5 rounded bg-white/5 animate-pulse" />
            </div>
            <div className="w-20 h-12 rounded-xl bg-white/5 animate-pulse" />
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-20 h-4 rounded bg-white/10 animate-pulse" />
              <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse" />
            </div>
            <div className="w-24 h-10 rounded bg-white/10 animate-pulse mb-2" />
            <div className="w-16 h-4 rounded bg-white/5 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Second Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Gauge Section */}
        <div className="glass-card p-6">
          <div className="w-40 h-6 rounded bg-white/10 animate-pulse mb-6" />
          <div className="flex justify-around">
            <div className="w-24 h-24 rounded-full bg-white/5 animate-pulse" />
            <div className="w-24 h-24 rounded-full bg-white/5 animate-pulse" />
          </div>
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex justify-between">
              <div className="w-32 h-4 rounded bg-white/5 animate-pulse" />
              <div className="w-20 h-4 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Status Today */}
        <div className="glass-card p-6">
          <div className="w-28 h-6 rounded bg-white/10 animate-pulse mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 animate-pulse" />
                  <div className="w-20 h-4 rounded bg-white/10 animate-pulse" />
                </div>
                <div className="w-12 h-5 rounded bg-white/10 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="w-32 h-6 rounded bg-white/10 animate-pulse" />
            <div className="w-12 h-4 rounded bg-white/5 animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-white/5">
                <div className="w-32 h-4 rounded bg-white/10 animate-pulse mb-2" />
                <div className="w-20 h-3 rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Skeleton */}
      <div className="glass-card p-6">
        <div className="w-32 h-6 rounded bg-white/10 animate-pulse mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-white/5 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-white/10 mb-3" />
              <div className="w-24 h-4 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}