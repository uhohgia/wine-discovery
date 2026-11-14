import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const variants = {
  primary: 'bg-wine text-white hover:bg-wine-dark active:bg-wine-dark',
  secondary: 'border-2 border-wine bg-transparent text-wine hover:bg-sand',
  ghost: 'text-wine hover:bg-sand',
  danger: 'border-2 border-red-800 bg-transparent text-red-800 hover:bg-red-50',
} as const
type Variant = keyof typeof variants

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: LinkProps & { variant?: Variant }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-card p-4 ${className}`}>{children}</div>
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="px-4 pt-6 pb-3">
      <h1 className="text-3xl leading-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
    </header>
  )
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mx-4 mt-6 flex flex-col items-center rounded-3xl border border-dashed border-line bg-card px-6 py-10 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-full bg-sand text-wine [&>svg]:size-8">{icon}</div>
      <h2 className="text-xl">{title}</h2>
      {children && <p className="mt-2 max-w-xs text-muted">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
