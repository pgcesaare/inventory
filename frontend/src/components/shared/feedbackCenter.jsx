import { useEffect } from "react"
import { CheckCircle2, AlertTriangle } from "lucide-react"
import { useAppContext } from "../../context"

const FeedbackCenter = () => {
  const {
    notification,
    setNotification,
    confirmDialog,
    resolveConfirm,
  } = useAppContext()

  useEffect(() => {
    if (!notification) return undefined
    const timeout = window.setTimeout(() => {
      setNotification(null)
    }, notification.duration || 3200)
    return () => window.clearTimeout(timeout)
  }, [notification, setNotification])

  return (
    <>
      {notification && (
        <div className="fixed right-4 top-4 z-[120] max-w-sm">
          <div
            className={`rounded-xl border px-4 py-3 shadow-lg ${
              notification.type === "error"
                ? "border-red-200 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-950/70 dark:text-red-100"
                : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/70 dark:text-emerald-100"
            }`}
          >
            <div className="flex items-start gap-2">
              {notification.type === "error" ? (
                <AlertTriangle className="mt-0.5 size-4 text-red-600 dark:text-red-300" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 text-emerald-600 dark:text-emerald-300" />
              )}
              <div className="min-w-0">
                {notification.title && (
                  <p className="text-sm font-semibold">{notification.title}</p>
                )}
                <p className="text-sm opacity-95">{notification.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[130]">
          <div
            className="absolute inset-0 bg-black/35"
            onClick={() => resolveConfirm(false)}
          />
          <div className="absolute left-1/2 top-1/2 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-primary-border/30 bg-white p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-primary-text">{confirmDialog.title}</h3>
            <p className="mt-2 text-sm text-secondary">{confirmDialog.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-primary-border/40 px-3 py-1.5 text-xs hover:bg-primary-border/10"
                onClick={() => resolveConfirm(false)}
              >
                {confirmDialog.cancelText || "NO"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-action-blue/80 bg-action-blue px-3 py-1.5 text-xs text-white hover:bg-action-blue/90"
                onClick={() => resolveConfirm(true)}
              >
                {confirmDialog.confirmText || "YES"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default FeedbackCenter
