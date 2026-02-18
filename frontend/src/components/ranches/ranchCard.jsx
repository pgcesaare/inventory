import { useState, useRef, useEffect, useMemo } from "react"
import { ArrowRight, MoreVertical, Trash2, Pencil } from "lucide-react"

const RanchCard = ({
  ranchId,
  ranchName,
  ranchAddress,
  ranchCity,
  ranchZipCode,
  ranchState,
  ranchColor,
  totalCattle,
  activeLots,
  managerName,
  lastUpdated,
  isHighlighted = false,
  onClick,
  onDelete,
  onEdit
}) => {

  const [openMenu, setOpenMenu] = useState(false)
  const menuRef = useRef(null)
  const colorThemes = useMemo(() => ([
    {
      panel: "bg-[#eceaf4] dark:bg-slate-800/90",
      footer: "bg-white dark:bg-slate-900/90",
      dot: "bg-slate-400/75",
    },
    {
      panel: "bg-[#f3ecdf] dark:bg-zinc-800/90",
      footer: "bg-white dark:bg-zinc-900/90",
      dot: "bg-zinc-400/75",
    },
    {
      panel: "bg-[#e9efdf] dark:bg-emerald-900/25",
      footer: "bg-white dark:bg-emerald-950/40",
      dot: "bg-emerald-500/55",
    },
    {
      panel: "bg-[#f1e7ec] dark:bg-rose-900/20",
      footer: "bg-white dark:bg-rose-950/35",
      dot: "bg-rose-400/70",
    },
  ]), [])

  const cardTheme = colorThemes[Math.abs(Number(ranchId || 0)) % colorThemes.length]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return(
    <div 
      id={ranchId ? `ranch-card-${ranchId}` : undefined}
      onClick={onClick}
      className={`
        w-full h-full
        overflow-hidden
        rounded-[28px]
        border border-primary-border/45 dark:border-primary-border/80
        bg-white dark:bg-surface
        shadow-[0_10px_30px_-18px_rgba(0,0,0,0.45)]
        hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-16px_rgba(0,0,0,0.42)]
        transition-all duration-200
        cursor-pointer
        group
        ${isHighlighted ? "ring-2 ring-action-blue/70 ring-offset-2" : ""}
      `}
      data-highlighted={isHighlighted ? "true" : "false"}
    >
      <div className={`relative min-h-[240px] p-5 ${cardTheme.panel}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-primary/70 dark:text-white/60">
              {ranchState || "State"}
            </p>
            <p className="mt-1 text-sm text-primary/80 dark:text-white/80 truncate">
              {ranchCity || "No City"}{ranchZipCode ? `, ${ranchZipCode}` : ""}
            </p>
          </div>
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setOpenMenu(!openMenu)
              }}
              className="rounded-lg p-2 text-primary/70 hover:bg-white/55 dark:hover:bg-black/30 transition"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {openMenu && (
              <div className="
                absolute right-0 mt-2 z-20
                w-36
                bg-white dark:bg-surface
                border border-primary-border/40 dark:border-primary-border/75
                rounded-xl
                shadow-md
                py-2
                animate-in fade-in zoom-in-95
              ">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenMenu(false)
                    onEdit && onEdit()
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-primary-text hover:bg-primary-border/20 transition"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenMenu(false)
                    onDelete && onDelete()
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        <h3 className="mt-6 max-w-[14ch] text-[38px] leading-[1.02] tracking-tight font-semibold text-primary dark:text-white">
          {ranchName}
        </h3>
        <div className="absolute inset-x-5 bottom-5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${cardTheme.dot}`} />
            <span className={`h-1.5 w-1.5 rounded-full ${cardTheme.dot} opacity-75`} />
            <span className={`h-1.5 w-1.5 rounded-full ${cardTheme.dot} opacity-55`} />
            <span className={`h-1.5 w-1.5 rounded-full ${cardTheme.dot} opacity-40`} />
          </div>
          <ArrowRight className="h-5 w-5 text-primary/70 dark:text-white/65 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>

      <div className={`p-4 ${cardTheme.footer}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <div
              style={{ backgroundColor: ranchColor }}
              className="h-10 w-10 rounded-xl border border-primary-border/35 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[17px] font-semibold text-primary dark:text-white truncate">
                {managerName || "No Manager"}
              </p>
              <p className="text-[12px] text-secondary truncate">
                {ranchAddress || "No Address"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClick && onClick()
            }}
            className="shrink-0 rounded-full bg-primary text-white dark:bg-white dark:text-surface px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
          >
            View
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-primary-border/40 dark:border-primary-border/70 bg-background/45 dark:bg-black/15 px-2.5 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-secondary">Cattle</p>
            <p className="mt-1 text-sm font-semibold text-primary dark:text-white">{totalCattle ?? 0}</p>
          </div>
          <div className="rounded-xl border border-primary-border/40 dark:border-primary-border/70 bg-background/45 dark:bg-black/15 px-2.5 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-secondary">Loads</p>
            <p className="mt-1 text-sm font-semibold text-primary dark:text-white">{activeLots ?? 0}</p>
          </div>
          <div className="rounded-xl border border-primary-border/40 dark:border-primary-border/70 bg-background/45 dark:bg-black/15 px-2.5 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-secondary">Updated</p>
            <p className="mt-1 text-sm font-semibold text-primary dark:text-white truncate">{lastUpdated || "N/A"}</p>
          </div>
        </div>

      </div>
    </div>
  )
}

export default RanchCard
