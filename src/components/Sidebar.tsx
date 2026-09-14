import type { LucideIcon } from 'lucide-react'
import {
  Disc3,
  Library,
  ListMusic,
  Menu,
  MicVocal,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Plus,
  Sun,
  X,
} from 'lucide-react'
import { useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  ThemeToggler,
  type Resolved,
  type ThemeSelection,
} from '@/components/animate-ui/primitives/effects/theme-toggler'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from '@/components/ui/Drawer'
import { useApp } from '@/contexts/app'
import {GradientText} from "@/components/animate-ui/primitives/texts/gradient.tsx";

const NAV_ITEMS: { path: string; label: string; icon: LucideIcon }[] = [
  { path: '/library', label: 'Library', icon: Library },
  { path: '/artists', label: 'Artists', icon: MicVocal },
  { path: '/composers', label: 'Composers', icon: PenLine },
  { path: '/albums', label: 'Albums', icon: Disc3 },
  { path: '/playlists', label: 'Playlists', icon: ListMusic },
]

const NAV_BASE = 'w-full flex items-center gap-2.5 border-l-2 pl-5 pr-4 py-2 text-left text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function navClass({ isActive }: { isActive: boolean }): string {
  return cn(
    NAV_BASE,
    isActive
      ? 'border-foreground font-semibold text-foreground'
      : 'border-transparent text-muted-foreground hover:text-foreground',
  )
}

// Icon-only rail: the same buttons, square instead of full width, label moved to
// the tooltip so the column still explains itself.
const RAIL_BTN = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const RAIL_IDLE = 'text-muted-foreground hover:bg-accent hover:text-foreground'

function railClass({ isActive }: { isActive: boolean }): string {
  return cn(RAIL_BTN, isActive ? 'bg-accent text-foreground' : RAIL_IDLE)
}

function ThemeIcon({ resolved }: { resolved: Resolved }) {
  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.span
        key={resolved}
        initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="flex h-4 w-4 items-center justify-center"
      >
        {resolved === 'dark'
          ? <Moon size={16} aria-hidden="true" />
          : <Sun size={16} aria-hidden="true" />}
      </motion.span>
    </AnimatePresence>
  )
}

function ThemeToggle({ rail = false }: { rail?: boolean }) {
  const { theme, setTheme } = useApp()

  // ThemeToggler also models 'system'. Sonata ships two modes and the button
  // below only ever asks for one of them, so nothing else can arrive here.
  const applyTheme = useCallback((next: ThemeSelection) => {
    if (next === 'system') return
    setTheme(next)
  }, [setTheme])

  return (
    <ThemeToggler theme={theme} resolvedTheme={theme} setTheme={applyTheme} direction="circular">
      {({ resolved, toggleTheme, buttonRef }) => (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => toggleTheme(resolved === 'dark' ? 'light' : 'dark')}
          aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={resolved === 'dark' ? 'Dark theme' : 'Light theme'}
          className={cn(
            rail
              ? cn(RAIL_BTN, RAIL_IDLE)
              : 'flex items-center gap-2 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <ThemeIcon resolved={resolved} />
          {!rail && (resolved === 'dark' ? 'Dark theme' : 'Light theme')}
        </button>
      )}
    </ThemeToggler>
  )
}

function SidebarRail({ asDrawer = false }: { asDrawer?: boolean }) {
  const { importMusic, openSidebar, toggleSidebarCollapsed } = useApp()

  return (
    <aside className="flex w-[60px] shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar px-2 py-3">
      {/* On a phone the rail can't grow, so this opens the drawer instead. */}
      <button
        type="button"
        onClick={asDrawer ? openSidebar : toggleSidebarCollapsed}
        aria-label={asDrawer ? 'Open navigation' : 'Expand navigation'}
        aria-haspopup={asDrawer ? 'dialog' : undefined}
        className={cn(RAIL_BTN, RAIL_IDLE)}
      >
        {asDrawer
          ? <Menu size={18} aria-hidden="true" />
          : <PanelLeftOpen size={18} aria-hidden="true" />}
      </button>

      <button
        type="button"
        onClick={importMusic}
        aria-label="Add Music"
        title="Add Music"
        className={cn(RAIL_BTN, RAIL_IDLE)}
      >
        <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
      </button>

      <span className="my-2 h-px w-5 shrink-0 bg-sidebar-border" aria-hidden="true" />

      {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          aria-label={label}
          title={label}
          className={railClass}
        >
          <Icon size={16} aria-hidden="true" />
        </NavLink>
      ))}

      <span className="flex-1" aria-hidden="true" />

      <ThemeToggle rail />
    </aside>
  )
}

function SidebarContent({ dismissible = false }: { dismissible?: boolean }) {
  const {
    playlists,
    tracks,
    importMusic,
    closeSidebar,
    toggleSidebarCollapsed,
    requestCreatePlaylist,
    requestResetLibrary,
  } = useApp()

  return (
    <>
      {/* vaul unmounts the drawer when it closes, so this only renders where the
          dialog title is a requirement rather than a duplicate wordmark. */}
      {dismissible && <DrawerTitle className="sr-only">Navigation</DrawerTitle>}

      <div className="flex items-center justify-between gap-2 pt-7 pb-6 px-5">
        <GradientText className="text-4xl font-['Google_Sans']" text='Sonata' neon={true}/>
        {dismissible ? (
          <DrawerClose
            onClick={closeSidebar}
            aria-label="Close navigation"
            className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={18} aria-hidden="true" />
          </DrawerClose>
        ) : (
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            aria-label="Collapse navigation"
            className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PanelLeftClose size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label="Main navigation" className="shrink-0">
        <button
          onClick={importMusic}
          className="w-full flex items-center gap-2 border-l-2 border-transparent pl-5 pr-4 py-2 text-left text-[15px] font-medium text-foreground hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
          Add Music
        </button>

        <p className="mt-6 mb-2 px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          My Collection
        </p>
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink key={path} to={path} className={navClass} onClick={closeSidebar}>
            <Icon size={16} className="shrink-0" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1 min-h-0 flex flex-col mt-6">
        <div className="mb-2 flex items-center justify-between gap-2 pr-3 pl-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Playlists
          </p>
          <button
            onClick={requestCreatePlaylist}
            aria-label="Create new playlist"
            className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto pb-2">
          {playlists.map(playlist => (
            <NavLink
              key={playlist.id}
              to={`/playlists/${playlist.id}`}
              onClick={closeSidebar}
              className={cn(NAV_BASE, 'py-1.5 text-[14px]')}
            >
              <ListMusic size={16} className="shrink-0 opacity-70" aria-hidden="true" />
              <span className="truncate">{playlist.name}</span>
            </NavLink>
          ))}
        </div>
      </div>

      <div className="px-5 pb-5 space-y-2">
        <ThemeToggle />
        {(tracks.length > 0 || playlists.length > 0) && (
          <button
            type="button"
            onClick={requestResetLibrary}
            className="block text-xs text-muted-foreground/70 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            Clear cached library
          </button>
        )}
      </div>
    </>
  )
}

export default function Sidebar() {
  const { sidebarOpen, sidebarCollapsed, closeSidebar } = useApp()
  // Below `lg` the full column never fits — it has to cover the page, which makes
  // it a dialog (Escape, focus trap, `aria-modal`, focus return) rather than a
  // restyled <aside>. The rail stays behind it as the permanent navigation.
  const isDrawer = useMediaQuery('(max-width: 1023px)')

  if (isDrawer) {
    return (
      <>
        <SidebarRail asDrawer />
        <Drawer
          direction="left"
          shouldScaleBackground={false}
          open={sidebarOpen}
          onOpenChange={open => { if (!open) closeSidebar() }}
        >
          <DrawerContent
            direction="left"
            className="w-[240px] max-w-[80%] border-sidebar-border bg-sidebar"
          >
            <SidebarContent dismissible />
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  if (sidebarCollapsed) return <SidebarRail />

  return (
    <aside className="w-[240px] shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden">
      <SidebarContent />
    </aside>
  )
}
