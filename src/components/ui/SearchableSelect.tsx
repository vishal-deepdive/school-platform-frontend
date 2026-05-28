import { useState, useEffect, useRef } from 'react'
import { Search, ChevronDown, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchableSelectOption {
  label: string
  value: string
  sublabel?: string
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  label?: string
  error?: string
  hint?: string
  className?: string
  isLoading?: boolean
  onSearchChange?: (query: string) => void
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  label,
  error,
  hint,
  className,
  isLoading = false,
  onSearchChange
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredOptions = onSearchChange 
    ? options 
    : options.filter(opt => 
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (opt.sublabel && opt.sublabel.toLowerCase().includes(searchQuery.toLowerCase()))
      )

  const selectedOption = options.find(opt => opt.value === value)

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
    setSearchQuery('')
    if (onSearchChange) onSearchChange('')
  }

  return (
    <div className={cn("grid gap-2 w-full relative", className)} ref={dropdownRef}>
      {label && (
        <label className="text-sm font-medium leading-none">
          {label}
        </label>
      )}

      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-lg border border-input dark:border-input/50 bg-background px-3 py-2 cursor-pointer',
          'text-sm text-foreground shadow-sm shadow-black/5 transition-all duration-200',
          'hover:border-primary/50 focus-visible:bg-accent focus-visible:outline-none',
          isOpen && 'ring-2 ring-primary/20 border-primary',
          error && 'border-destructive ring-0',
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-muted-foreground/70")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-200", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] z-50 w-full rounded-md border border-border bg-background text-foreground shadow-md animate-in fade-in-80 slide-in-from-top-1 flex flex-col max-h-60 overflow-hidden">
          <div className="flex items-center px-3 py-2 border-b border-border/50 sticky top-0 bg-background z-10">
            <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <input
              type="text"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (onSearchChange) onSearchChange(e.target.value)
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          
          <div className="overflow-y-auto scrollbar-thin p-1">
            {isLoading ? (
              <div className="px-3 py-4 text-sm text-muted-foreground flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">No results found.</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none flex-col rounded-sm py-2 px-3 text-sm outline-none transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    value === opt.value && "bg-primary/10 text-primary font-medium"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelect(opt.value)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt.label}</span>
                    {value === opt.value && <Check className="h-4 w-4 ml-2 shrink-0" />}
                  </div>
                  {opt.sublabel && (
                    <span className="text-xs text-muted-foreground mt-0.5">{opt.sublabel}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {hint && !error && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      {error && <p className="text-xs text-destructive font-medium mt-0.5">{error}</p>}
    </div>
  )
}
