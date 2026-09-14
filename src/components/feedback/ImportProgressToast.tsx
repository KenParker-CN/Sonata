import type { ImportProgress } from '@/hooks/useImportManager'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

interface ImportProgressToastProps {
  progress: ImportProgress
}

export default function ImportProgressToast({ progress }: ImportProgressToastProps) {
  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <AnimatePresence>
      {progress.status !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed top-4 right-4 z-[100] w-[380px] bg-popover border border-border rounded-lg shadow-lg p-4"
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            {progress.status === 'importing' && (
              <Loader2 size={20} className="text-primary animate-spin shrink-0 mt-0.5" />
            )}
            {progress.status === 'completed' && (
              <CheckCircle2 size={20} className="text-green-500 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground">
                {progress.status === 'importing' && 'Importing music'}
                {progress.status === 'completed' && 'Import complete'}
              </h4>

              {/* Progress info */}
              {progress.status === 'importing' && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {progress.currentFile}
                </p>
              )}

              {/* Completion summary */}
              {progress.status === 'completed' && (
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <p>Successfully imported: {progress.successCount}</p>
                  {progress.failureCount > 0 && (
                    <p className="text-destructive">Failed: {progress.failureCount}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Progress bar and count */}
          <div className="space-y-2">
            {/* Count */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {progress.current} / {progress.total}
              </span>
              <span className="font-medium text-foreground">{percentage}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-200 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
