import { useLocation } from 'react-router-dom'
import { Plus, X, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  onNavigate: (path: string) => void
  onImportMusic?: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  isOpen?: boolean
  onClose?: () => void
}

const NAV_ITEMS: { path: string; label: string }[] = [
  { path: '/library', label: 'Library' },
  { path: '/artists', label: 'Artists' },
  { path: '/albums', label: 'Albums' },
  { path: '/playlists', label: 'Playlists' },
]

export default function Sidebar({ onNavigate, onImportMusic, theme, onToggleTheme, isOpen, onClose }: SidebarProps) {
  const location = useLocation()

  const handleNavClick = (path: string) => {
    onNavigate(path)
    onClose?.()
  }

  return (
    <aside className={cn(
      "w-[240px] shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden",
      "fixed lg:relative inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out",
      isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      {/* Close button for mobile */}
      <div className="lg:hidden absolute top-4 right-4">
        <button
          onClick={onClose}
          aria-label="Close navigation"
          className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={18} />
        </button>
      </div>

      <div className="pt-16 lg:pt-7 pb-6 px-5">
        <span className="text-sm font-bold tracking-[0.22em] uppercase text-foreground">Sonata</span>
      </div>

      <nav aria-label="Main navigation" className="flex-1">
        <button
          onClick={onImportMusic}
          className="w-full flex items-center gap-2 border-l-2 border-transparent pl-5 pr-4 py-2 text-left text-[15px] font-medium text-foreground hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus size={16} strokeWidth={2.4} />
          Add Music
        </button>

        <p className="mt-6 mb-2 px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          My Collection
        </p>
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'w-full block border-l-2 pl-5 pr-4 py-2 text-left text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'border-foreground font-semibold text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="px-5 pb-5">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          {theme === 'light' ? <Sun size={14} /> : <Moon size={14} />}
          {theme === 'light' ? 'Light theme' : 'Dark theme'}
        </button>
      </div>
    </aside>
  )
}
