import * as React from "react"
import { cn } from "@/lib/utils"

export type BadgeVariant = "blue" | "yellow" | "orange" | "green"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  green: "bg-green-100 text-green-800 border-green-200",
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "blue", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold",
          variantStyles[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }