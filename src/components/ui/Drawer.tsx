import * as React from 'react'
import { Drawer as HeroDrawer, cn } from '@heroui/react'

/**
 * Drawer — migrated from Vaul Drawer to HeroUI v3 Drawer.
 *
 * HeroUI's compound-component structure is wrapped here so consumers keep the
 * old API: Drawer + DrawerContent + DrawerHeader/Footer/Title/Description.
 *
 * Prop mapping:
 *   direction (old)  → placement (HeroUI Drawer.Content)
 *   modal={false}    → isDismissable={false} (HeroUI Drawer.Backdrop)
 *   overlayClassName → className on Drawer.Backdrop
 *
 * Internal tree:
 *   Drawer (root) → [DrawerContent → Drawer.Backdrop → Drawer.Content → Drawer.Dialog → content]
 */

type DrawerDirection = 'top' | 'bottom' | 'left' | 'right'

// Drawer root — thin wrapper over HeroUI's root. Renders children as-is so
// DrawerContent (which carries the backdrop + panel) slots in naturally.
// Vaul-specific props (direction, modal, shouldScaleBackground) are explicitly
// ignored — they belong on DrawerContent, not the root.
const Drawer = ({
  open,
  onOpenChange,
  children,
  direction: _direction,
  modal: _modal,
  shouldScaleBackground: _shouldScaleBackground,
  ...props
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  direction?: DrawerDirection
  modal?: boolean
  shouldScaleBackground?: boolean
  children?: React.ReactNode
}) => (
  <HeroDrawer isOpen={open} onOpenChange={onOpenChange} {...props}>
    {children}
  </HeroDrawer>
)
Drawer.displayName = 'Drawer'

const DrawerTrigger = HeroDrawer.Trigger

const DrawerClose = ({
  className,
  children,
  ...props
}: {
  className?: string
  children?: React.ReactNode
  onClick?: (e: React.MouseEvent) => void
  'aria-label'?: string
}) => (
  <HeroDrawer.CloseTrigger
    className={cn(
      'shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      className
    )}
    {...(props as React.ComponentProps<typeof HeroDrawer.CloseTrigger>)}
  >
    {children}
  </HeroDrawer.CloseTrigger>
)

// Portal and Overlay are structural elements HeroUI handles internally;
// re-exported as no-ops so existing imports keep resolving.
const DrawerPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>
const DrawerOverlay = () => null

interface DrawerContentProps {
  className?: string
  children?: React.ReactNode
  direction?: DrawerDirection
  /** Restyle the scrim this drawer renders — e.g. transparent for a non-modal panel. */
  overlayClassName?: string
  modal?: boolean
}

const DrawerContent = ({
  className,
  children,
  direction = 'bottom',
  overlayClassName,
  modal = true,
  ...props
}: DrawerContentProps) => (
  <HeroDrawer.Backdrop
    isDismissable={modal}
    className={overlayClassName}
  >
    <HeroDrawer.Content
      placement={direction}
      className={className}
      {...props}
    >
      <HeroDrawer.Dialog>
        {children}
      </HeroDrawer.Dialog>
    </HeroDrawer.Content>
  </HeroDrawer.Backdrop>
)
DrawerContent.displayName = 'DrawerContent'

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <HeroDrawer.Header
    className={cn('flex flex-col gap-1.5 p-4 text-center sm:text-left', className)}
    {...props}
  />
)
DrawerHeader.displayName = 'DrawerHeader'

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <HeroDrawer.Footer
    className={cn('mt-auto flex flex-col gap-2 p-4', className)}
    {...props}
  />
)
DrawerFooter.displayName = 'DrawerFooter'

const DrawerTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentProps<typeof HeroDrawer.Heading>
>(({ className, ...props }, ref) => (
  <HeroDrawer.Heading
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
DrawerTitle.displayName = 'DrawerTitle'

const DrawerDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
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
