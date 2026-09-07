import { Settings, Minus, Plus } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface LyricsControlsProps {
  showTranslation: boolean
  onShowTranslationChange: (value: boolean) => void
  showRomanization: boolean
  onShowRomanizationChange: (value: boolean) => void
  fontSize: number
  onFontSizeChange: (value: number) => void
  hasTranslation: boolean
  hasRomanization: boolean
}

const FONT_SIZES = [0.875, 1, 1.125, 1.25, 1.5, 1.75] // rem values: small, medium, large, x-large, xx-large, xxx-large
const MIN_FONT_SIZE = 0
const MAX_FONT_SIZE = FONT_SIZES.length - 1

export default function LyricsControls({
  showTranslation,
  onShowTranslationChange,
  showRomanization,
  onShowRomanizationChange,
  fontSize,
  onFontSizeChange,
  hasTranslation,
  hasRomanization,
}: LyricsControlsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDecreaseSize = () => {
    if (fontSize > MIN_FONT_SIZE) {
      onFontSizeChange(fontSize - 1)
    }
  }

  const handleIncreaseSize = () => {
    if (fontSize < MAX_FONT_SIZE) {
      onFontSizeChange(fontSize + 1)
    }
  }

  return (
    <div className="relative">
      {/* Control button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
          isOpen && 'text-foreground bg-accent'
        )}
        aria-label="Lyrics settings"
      >
        <Settings size={16} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full right-0 mt-2 w-64 rounded-md border bg-popover p-3 shadow-lg z-50"
        >
          <h3 className="text-sm font-medium mb-3">Lyrics</h3>

          {/* Translation toggle */}
          {hasTranslation && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Translation</span>
              <button
                onClick={() => onShowTranslationChange(!showTranslation)}
                className={cn(
                  'w-10 h-5 rounded-full relative transition-colors',
                  showTranslation ? 'bg-primary' : 'bg-muted'
                )}
                role="switch"
                aria-checked={showTranslation}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                    showTranslation ? 'left-5.5 translate-x-5' : 'left-0.5'
                  )}
                />
              </button>
            </div>
          )}

          {/* Romanization toggle */}
          {hasRomanization && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm">Romanization</span>
              <button
                onClick={() => onShowRomanizationChange(!showRomanization)}
                className={cn(
                  'w-10 h-5 rounded-full relative transition-colors',
                  showRomanization ? 'bg-primary' : 'bg-muted'
                )}
                role="switch"
                aria-checked={showRomanization}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                    showRomanization ? 'left-5.5 translate-x-5' : 'left-0.5'
                  )}
                />
              </button>
            </div>
          )}

          {/* Font size controls */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm">Text Size</span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleDecreaseSize}
                disabled={fontSize <= MIN_FONT_SIZE}
                className="p-1.5 rounded-md hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Decrease font size"
              >
                <Minus size={14} />
              </button>
              <span className="text-xs text-muted-foreground w-8 text-center">
                {['S', 'M', 'L', 'XL', 'XXL', 'XXXL'][fontSize]}
              </span>
              <button
                onClick={handleIncreaseSize}
                disabled={fontSize >= MAX_FONT_SIZE}
                className="p-1.5 rounded-md hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Increase font size"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
