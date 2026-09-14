import * as React from 'react'
import { cn } from '@/lib/utils'

type DrawerDirection = 'top' | 'bottom' | 'left' | 'right'

interface DrawerContextValue {
  open: boolean
  onOpenChange?: (open: boolean) => void
}

const DrawerContext = React.createContext<DrawerContextValue | null>(null)

function useDrawer() {
  const context = React.useContext(DrawerContext)
  if (!context) throw new Error('Drawer components must be used inside Drawer')
  return context
}

const Drawer = ({
  open = false,
  onOpenChange,
  children,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
  direction?: DrawerDirection
  modal?: boolean
  shouldScaleBackground?: boolean
}) => (
  <DrawerContext.Provider value={{ open, onOpenChange }}>
    {children}
  </DrawerContext.Provider>
)
Drawer.displayName = 'Drawer'

const DrawerTrigger = ({ children }: { children?: React.ReactNode }) => <>{children}</>

const DrawerClose = ({
  className,
  children,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { onOpenChange } = useDrawer()
  return (
    <button
      type="button"
      className={cn(
        'shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      onClick={event => {
        onClick?.(event)
        if (!event.defaultPrevented) onOpenChange?.(false)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

const DrawerPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>
const DrawerOverlay = () => null

interface DrawerContentProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: DrawerDirection
  overlayClassName?: string
  modal?: boolean
}

const drawerPosition: Record<DrawerDirection, string> = {
  top: 'top-0 left-0 right-0 w-full',
  bottom: 'bottom-0 left-0 right-0 w-full',
  left: 'bottom-0 left-0 top-0 h-full',
  right: 'bottom-0 right-0 top-0 h-full',
}

const DrawerContent = ({
  className,
  children,
  direction = 'bottom',
  overlayClassName,
  modal = true,
  ...props
}: DrawerContentProps) => {
  const { open, onOpenChange } = useDrawer()
  const dialogRef = React.useRef<HTMLDialogElement>(null)

  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      className={cn('fixed m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/45', overlayClassName)}
      onCancel={event => {
        event.preventDefault()
        if (modal) onOpenChange?.(false)
      }}
      onClick={event => {
        if (modal && event.target === event.currentTarget) onOpenChange?.(false)
      }}
    >
      <div
        className={cn(
          'fixed flex min-h-0 flex-col bg-popover text-popover-foreground shadow-xl outline-none',
          drawerPosition[direction],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </dialog>
  )
}
DrawerContent.displayName = 'DrawerContent'

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 p-4 text-center sm:text-left', className)} {...props} />
)
DrawerHeader.displayName = 'DrawerHeader'

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />
)
DrawerFooter.displayName = 'DrawerFooter'

const DrawerTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
  ),
)
DrawerTitle.displayName = 'DrawerTitle'

const DrawerDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  ),
)
DrawerDescription.displayName = 'DrawerDescription'

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
