interface ProgressRingSvgProps {
  size: number
  radius: number
  strokeWidth: number
  circumference: number
  offset: number
  className?: string
}

export function ProgressRingSvg({
  size,
  radius,
  strokeWidth,
  circumference,
  offset,
  className,
}: ProgressRingSvgProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-foreground/10"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-primary transition-all duration-1000 ease-out"
      />
    </svg>
  )
}