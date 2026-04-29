import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost"
  size?: "default" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-button font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-motor-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          size === "default" && "h-11 px-5 py-2 text-sm",
          size === "lg" && "h-12 px-6 py-3 text-base",
          variant === "primary" && "bg-motor-blue text-white hover:bg-blue-600 active:bg-blue-700",
          variant === "secondary" && "border-2 border-motor-blue bg-transparent text-motor-blue hover:bg-blue-50",
          variant === "ghost" && "text-motor-text-secondary hover:bg-gray-100 hover:text-motor-text",
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }