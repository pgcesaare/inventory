import { useState, useRef, useEffect } from "react"
import { MapPin, MoreVertical, Trash2, Pencil } from "lucide-react"

const RanchCard = ({
  ranchName,
  ranchAddress,
  ranchCity,
  ranchState,
  ranchColor,
  totalCattle,
  activeLots,
  managerName,
  lastUpdated,
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
      onClick={onClick}
      className="
        w-full
        flex flex-col
        gap-5
        p-5
        rounded-3xl
        bg-white
        border border-primary-border/40
        shadow-sm
        hover:shadow-md
        hover:-translate-y-[2px]
        transition-all duration-300
        cursor-pointer
        group
      "
    >

      {/* Header Color Section */}
      <div
        style={{ backgroundColor: ranchColor }}
        className="relative w-full h-[155px] rounded-2xl overflow-hidden border border-white/30"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-white/30" />

        {/* 3 Dots Button */}
        <div className="absolute top-3 right-3 z-20" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpenMenu(!openMenu)
            }}
            className="
              p-2.5
              rounded-full
              bg-white/85
              backdrop-blur-sm
              hover:bg-white
              transition
            "
          >
            <MoreVertical className="h-4 w-4 text-secondary" />
          </button>

          {/* Dropdown Menu */}
          {openMenu && (
            <div className="
              absolute right-0 mt-2
              w-40
              bg-white
              border border-primary-border/30
              rounded-xl
              shadow-md
              py-2
              animate-in fade-in zoom-in-95
            ">

              {/* Edit */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenMenu(false)
                  onEdit && onEdit()
                }}
                className="
                  w-full
                  flex items-center gap-2
                  px-4 py-2
                  text-sm
                  text-primary-text
                  hover:bg-primary-border/20
                  transition
                "
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenMenu(false)
                  onDelete && onDelete()
                }}
                className="
                  w-full
                  flex items-center gap-2
                  px-4 py-2
                  text-sm
                  text-red-500
                  hover:bg-red-50
                  transition
                "
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>

            </div>
          )}
        </div>

      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-4">

        {/* Title */}
        <div className="flex justify-between items-start">
          <h3 className="text-xl text-primary font-semibold tracking-tight leading-tight group-hover:text-action-blue transition-colors">
            {ranchName}
          </h3>
        </div>

        {/* Location */}
        <div className="flex items-start gap-3 text-secondary text-sm bg-background/70 rounded-xl p-3">
          <MapPin className="h-4 w-4 mt-0.5 opacity-60"/>
          <div className="leading-snug">
            <p>{ranchAddress}</p>
            <p className="opacity-70">
              {ranchCity}, {ranchState}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-between text-sm text-secondary pt-1">
          {totalCattle !== undefined && (
            <div className="flex flex-col rounded-xl border border-primary-border/30 bg-background/70 px-3 py-2 min-w-[120px]">
              <span className="opacity-60 text-xs">Cattle</span>
              <span className="text-primary font-medium">{totalCattle}</span>
            </div>
          )}

          {activeLots !== undefined && (
            <div className="flex flex-col rounded-xl border border-primary-border/30 bg-background/70 px-3 py-2 min-w-[120px] items-end">
              <span className="opacity-60 text-xs">Active Loads</span>
              <span className="text-primary font-medium">{activeLots}</span>
            </div>
          )}
        </div>

        {/* Footer Meta */}
        {(managerName || lastUpdated) && (
          <div className="flex justify-between text-xs text-secondary opacity-60">
            {managerName && <span>Manager: {managerName}</span>}
            {lastUpdated && <span>Updated {lastUpdated}</span>}
          </div>
        )}

      </div>
    </div>
  )
}

export default RanchCard
