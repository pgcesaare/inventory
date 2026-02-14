import { useState, useRef, useEffect } from "react"
import { MapPin, MoreVertical, Trash2, Pencil, Truck, CalendarClock, User } from "lucide-react"

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
        w-full
        grid grid-cols-1 lg:grid-cols-[minmax(260px,1.45fr)_minmax(230px,1fr)_minmax(150px,0.7fr)_minmax(110px,0.4fr)_minmax(120px,0.45fr)_minmax(150px,0.65fr)_56px]
        items-center
        gap-4
        px-4 py-4 lg:px-5
        rounded-2xl
        bg-white
        border border-primary-border/40
        shadow-sm
        hover:shadow-md hover:border-primary-border/70
        transition-all duration-200
        cursor-pointer
        group
        ${isHighlighted ? "ring-2 ring-action-blue/70 ring-offset-2" : ""}
      `}
      data-highlighted={isHighlighted ? "true" : "false"}
    >
      <div className="min-w-0 flex items-center gap-3">
        <div
          style={{ backgroundColor: ranchColor }}
          className="h-10 w-10 rounded-xl border border-primary-border/30 shrink-0"
        />
        <div className="min-w-0">
          <p className="text-primary text-[15px] font-semibold truncate group-hover:text-action-blue transition-colors">
            {ranchName}
          </p>
          <p className="text-[11px] text-secondary/75 truncate">
            {ranchAddress || "No address"}
          </p>
        </div>
      </div>

      <div className="text-sm text-secondary/85 min-w-0 flex items-start gap-2">
        <MapPin className="h-4 w-4 mt-0.5 shrink-0 opacity-65"/>
        <p className="truncate">
          {ranchCity || "-"}, {ranchState || "-"}{ranchZipCode ? ` ${ranchZipCode}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-secondary/85 min-w-0">
        <User className="h-4 w-4 shrink-0 opacity-65" />
        <p className="truncate">{managerName || "N/A"}</p>
      </div>

      <div className="flex items-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-action-blue/25 bg-action-blue/10 px-2.5 py-1 text-xs font-semibold text-action-blue">
          <span role="img" aria-label="Cow" className="leading-none">🐄</span>
          Cattle {totalCattle ?? 0}
        </span>
      </div>

      <div className="flex items-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-border/45 bg-background/60 px-2.5 py-1 text-xs font-semibold text-primary">
          <Truck className="h-3.5 w-3.5 shrink-0" />
          Loads {activeLots ?? 0}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-secondary/85 min-w-0">
        <CalendarClock className="h-4 w-4 shrink-0 opacity-65" />
        <span className="truncate">{lastUpdated || "N/A"}</span>
      </div>

      <div className="relative justify-self-end" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setOpenMenu(!openMenu)
          }}
          className="p-2 rounded-lg hover:bg-primary-border/15 transition"
        >
          <MoreVertical className="h-4 w-4 text-secondary" />
        </button>

        {openMenu && (
          <div className="
            absolute right-0 mt-2 z-20
            w-40
            bg-white
            border border-primary-border/40
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
  )
}

export default RanchCard
