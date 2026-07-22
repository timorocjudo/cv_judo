import Link from 'next/link'

type AlertVariant = 'warning' | 'info'

interface AlertAction {
  label: string
  href: string
}

interface AlertProps {
  variant?: AlertVariant
  title: string
  description?: string
  action?: AlertAction
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
}

const VARIANT_ICON: Record<AlertVariant, string> = {
  warning: '⚠️',
  info: 'ⓘ',
}

export default function Alert({ variant = 'info', title, description, action, className = '' }: AlertProps) {
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
