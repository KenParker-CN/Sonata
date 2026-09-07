import type { ImportProgress } from '@/hooks/useImportManager'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface ImportProgressToastProps {
  progress: ImportProgress
}

export default function ImportProgressToast({ progress }: ImportProgressToastProps) {
  if (progress.status === 'idle') {
    return null
  }

  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div className="fixed top-4 right-4 z-[100] w-[380px] bg-popover border border-border rounded-lg shadow-lg p-4 animate-in fade-in slide-in-from-top-2">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {progress.status === 'importing' && (
          <Loader2 size={20} className="text-primary animate-spin shrink-0 mt-0.5" />
        )}
        {progress.status === 'completed' && (
          <CheckCircle2 size={20} className="text-green-500 shrink-0 mt-0.5" />
        )}
        {progress.status === 'error' && (
          <XCircle size={20} className="text-destructive shrink-0 mt-0.5" />
        )}

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground">
            {progress.status === 'importing' && 'Importing music'}
            {progress.status === 'completed' && 'Import complete'}
            {progress.status === 'error' && 'Import failed'}
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
      {(progress.status === 'importing' || progress.status === 'completed') && (
        <div className="space-y-2">
          {/* Count */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {progress.current} / {progress.total}
            </span>
            <span className="font-medium text-foreground">{percentage}%</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
