import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'

const CANCEL = 'px-4 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors'
const DESTRUCTIVE = 'px-4 py-2 rounded-md text-sm bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-opacity'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const close = () => onOpenChange(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button type="button" onClick={close} className={CANCEL}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm()
              close()
            }}
            className={DESTRUCTIVE}
          >
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
