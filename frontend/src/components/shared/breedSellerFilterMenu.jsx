import React, { useEffect, useMemo, useRef, useState } from "react"
import { SlidersHorizontal } from "lucide-react"

const BreedSellerFilterMenu = ({
  breed,
  seller,
  breedOptions = [],
  sellerOptions = [],
  onChange,
  showBreed = true,
  showSeller = true,
  className = "",
  menuAlign = "left",
}) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const label = useMemo(() => {
    const parts = []
    if (showBreed && breed) parts.push(`Breed: ${breed}`)
    if (showSeller && seller) parts.push(`Seller: ${seller}`)
    if (parts.length === 0) return "Filter"
    return parts.join(" | ")
  }, [breed, seller, showBreed, showSeller])

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        className="h-full min-h-[40px] w-full inline-flex items-center justify-between gap-2 rounded-xl border border-primary-border/40 px-3 py-1.5 text-xs text-left hover:bg-primary-border/10"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="truncate">{label}</span>
        <SlidersHorizontal className="size-4 text-secondary shrink-0" />
      </button>

      {open && (
        <div className={`absolute ${menuAlign === "right" ? "right-0 left-auto" : "left-0"} mt-2 z-30 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-primary-border/30 bg-surface p-3 shadow-lg`}>
          <div className="space-y-3">
            {showBreed && (
              <div>
                <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Breed</label>
                <select
                  className="mt-1 w-full rounded-lg border border-primary-border/40 px-3 py-2 text-xs"
                  value={breed || ""}
                  onChange={(e) => onChange({ breed: e.target.value, seller })}
                >
                  <option value="">All breeds</option>
                  {breedOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            )}

            {showSeller && (
              <div>
                <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Seller</label>
                <select
                  className="mt-1 w-full rounded-lg border border-primary-border/40 px-3 py-2 text-xs"
                  value={seller || ""}
                  onChange={(e) => onChange({ breed, seller: e.target.value })}
                >
                  <option value="">All sellers</option>
                  {sellerOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              className="w-full rounded-lg border border-primary-border/40 px-3 py-2 text-xs hover:bg-primary-border/10"
              onClick={() => onChange({ breed: "", seller: "" })}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BreedSellerFilterMenu
