import type { SVGProps } from 'react'

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export const CameraIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4V8Z" />
    <circle cx="12" cy="13" r="3.6" />
  </Icon>
)
export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon strokeWidth="2.2" {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
)
export const GlassIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M7 3h10c0 6-1.6 10-5 11-3.4-1-5-5-5-11Z" />
    <path d="M12 14v7M8 21h8" />
  </Icon>
)
