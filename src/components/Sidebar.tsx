import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Library, Users, Disc3, ListMusic, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  onNavigate: (path: string) => void
  onFilesSelected?: (files: File[]) => void
  isOpen?: boolean
  onClose?: () => void
}

const NAV_ITEMS: { path: string; label: string; icon: typeof Library }[] = [
  { path: '/library', label: 'Library', icon: Library },
  { path: '/artists', label: 'Artists', icon: Users },
  { path: '/albums', label: 'Albums', icon: Disc3 },
  { path: '/playlists', label: 'Playlists', icon: ListMusic },
]

export default function Sidebar({ onNavigate, onFilesSelected, isOpen, onClose }: SidebarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const location = useLocation()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files
    if (!fileList) return
    const audioFiles = Array.from(fileList).filter(f => f.type.startsWith('audio/'))
    if (audioFiles.length > 0 && onFilesSelected) {
      onFilesSelected(audioFiles)
    }
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleNavClick = (path: string) => {
    onNavigate(path)
    onClose?.()
  }

  return (
    <aside className={cn(
      "w-[300px] shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden",
      "fixed lg:relative inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out",
      isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      {/* Close button for mobile */}
      <div className="lg:hidden absolute top-4 right-4">
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-4 pb-2 pt-16 lg:pt-4">
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-base font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          Add Music
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          multiple
          {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
          onChange={handleChange}
          className="hidden"
        />
      </div>

      <nav className="flex-1 px-2 py-2">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-base transition-colors',
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
