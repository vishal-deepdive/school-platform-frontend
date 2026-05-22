import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn('border-b border-gray-200', className)}>
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              active === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
