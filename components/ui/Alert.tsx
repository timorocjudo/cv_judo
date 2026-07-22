import Link from 'next/link'
import type { ReactNode } from 'react'

type AlertVariant = 'warning' | 'info' | 'danger'

interface AlertAction {
  label: string
  href: string
}

interface AlertProps {
  variant?: AlertVariant
  title: string
  description?: string
  action?: AlertAction
  children?: ReactNode
  className?: string
}

const VARIANT_STYLES: Record<AlertVariant, {
  container: string
  icon: string
  title: string
  action: string
}> = {
  warning: {
    container: 'bg-tertiary-container/10 border-l-4 border-tertiary-container',
    icon: 'text-tertiary',
    title: 'text-on-surface',
    action: 'bg-tertiary-container text-on-tertiary-container hover:bg-tertiary-fixed-dim',
  },
  info: {
    container: 'bg-primary-container/10 border-l-4 border-primary',
    icon: 'text-primary',
    title: 'text-on-surface',
    action: 'bg-primary text-on-primary hover:bg-primary-container',
  },
  danger: {
    container: 'bg-error/10 border-l-4 border-error',
    icon: 'text-error',
    title: 'text-on-surface',
    action: 'bg-error text-white hover:bg-error/90',
  },
}

const VARIANT_ICON: Record<AlertVariant, string> = {
  warning: '⚠️',
  info: 'ⓘ',
  danger: '⛔',
}

export default function Alert({ variant = 'info', title, description, action, children, className = '' }: AlertProps) {
  const styles = VARIANT_STYLES[variant]

  return (
    <div className={`rounded-lg p-4 flex gap-3 ${styles.container} ${className}`}>
      <span className={`text-lg leading-none flex-shrink-0 ${styles.icon}`} aria-hidden="true">
        {VARIANT_ICON[variant]}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`font-montserrat font-bold text-sm ${styles.title}`}>{title}</p>
        {description && (
          <p className="text-sm text-on-surface-variant mt-1">{description}</p>
        )}
        {children}
        {action && (
          <Link
            href={action.href}
            className={`inline-block mt-3 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${styles.action}`}
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  )
}
