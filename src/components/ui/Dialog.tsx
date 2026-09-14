import * as React from 'react'
import { Modal as HeroModal, cn } from '@heroui/react'
import { X } from 'lucide-react'

/**
 * Dialog — migrated from Radix Dialog to HeroUI v3 Modal.
 *
 * HeroUI's compound-component structure is wrapped here so consumers keep the
 * old API: Dialog + DialogContent + DialogHeader/Footer/Title/Description.
 *
 * Internal tree:
 *   Dialog → Modal → Modal.Backdrop → Modal.Container → Modal.Dialog → content
 */

const Dialog = ({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}) => (
  <HeroModal isOpen={open} onOpenChange={onOpenChange}>
    <HeroModal.Backdrop>
      <HeroModal.Container>
        <HeroModal.Dialog>
          {children}
        </HeroModal.Dialog>
      </HeroModal.Container>
    </HeroModal.Backdrop>
  </HeroModal>
)

const DialogTrigger = HeroModal.Trigger

const DialogClose = ({
  className,
  children,
  ...props
}: {
  className?: string
  children?: React.ReactNode
}) => (
  <HeroModal.CloseTrigger className={cn('absolute right-4 top-4', className)} {...props}>
    {children ?? (
      <>
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </>
    )}
  </HeroModal.CloseTrigger>
)

// Portal and Overlay are structural elements HeroUI handles internally;
// re-exported as no-ops so existing imports keep resolving.
const DialogPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>
const DialogOverlay = () => null

const DialogContent = ({
  className,
  children,
  ...props
}: {
  className?: string
  children?: React.ReactNode
}) => (
  <HeroModal.Dialog className={cn('outline-none', className)} {...props}>
    {children}
    <DialogClose />
  </HeroModal.Dialog>
)
DialogContent.displayName = 'DialogContent'

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <HeroModal.Header
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left p-0', className)}
    {...props}
  />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <HeroModal.Footer
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-0', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentProps<typeof HeroModal.Heading>
>(({ className, ...props }, ref) => (
  <HeroModal.Heading
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = 'DialogDescription'

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
