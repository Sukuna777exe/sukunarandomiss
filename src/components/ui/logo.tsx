import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16"
}

export function Logo({ className, size = "md" }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        <img
          src="/sukunarandomiss/randomiss-logo.svg"
          alt="Randomiss Logo"
          className="w-full h-full object-contain"
        />
      </div>
      <span className={cn(
        "font-bold tracking-tight text-white",
        size === "sm" && "text-lg",
        size === "md" && "text-xl",
        size === "lg" && "text-2xl"
      )}>
        Randomiss
      </span>
    </div>
  )
} 