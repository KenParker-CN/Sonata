import { useLocation } from 'react-router-dom'
import { Library, Users, Disc3, ListMusic, Plus, X, Music2, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  onNavigate: (path: string) => void
  onImportMusic?: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  isOpen?: boolean
  onClose?: () => void
}

const NAV_ITEMS: { path: string; label: string; icon: typeof Library }[] = [
  { path: '/library', label: 'Library', icon: Library },
  { path: '/artists', label: 'Artists', icon: Users },
  { path: '/albums', label: 'Albums', icon: Disc3 },
  { path: '/playlists', label: 'Playlists', icon: ListMusic },
]

export default function Sidebar({ onNavigate, onImportMusic, theme, onToggleTheme, isOpen, onClose }: SidebarProps) {
  const location = useLocation()

  const handleNavClick = (path: string) => {
    onNavigate(path)
    onClose?.()
  }

  return (
    <aside className={cn(
      "w-[272px] shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden shadow-sm",
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

      <div className="p-5 pb-3 pt-16 lg:pt-5">
        <div className="flex items-center gap-2 px-1 pb-5 text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Music2 size={17} />
          </span>
          <span className="text-sm font-semibold tracking-[0.18em] uppercase">Sonata</span>
        </div>
        <button
          onClick={onImportMusic}
          aria-label="Add music"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:brightness-105 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
        >
          <Plus size={17} />
          Add Music
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          className="mt-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-2">
            {theme === 'light' ? <Sun size={15} /> : <Moon size={15} />}
            {theme === 'light' ? 'Light theme' : 'Dark theme'}
          </span>
          <span className="text-[10px] uppercase tracking-wider">Switch</span>
        </button>
      </div>

      <nav aria-label="Main navigation" className="flex-1 px-3 py-3">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <Icon size={20} />
              {item.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
