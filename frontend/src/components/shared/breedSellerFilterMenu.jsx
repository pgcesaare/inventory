import React, { useEffect, useMemo, useRef, useState } from "react"
import { SlidersHorizontal, Search, X } from "lucide-react"

const toArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (value === null || value === undefined || value === "") return []
  return [value]
}
const toTitleCase = (value) => String(value || "").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())

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
  const [breedSearch, setBreedSearch] = useState("")
  const [sellerSearch, setSellerSearch] = useState("")
  const selectedBreeds = useMemo(() => toArray(breed), [breed])
  const selectedSellers = useMemo(() => toArray(seller), [seller])
  const visibleBreedOptions = useMemo(
    () => breedOptions.filter((option) => String(option).toLowerCase().includes(breedSearch.toLowerCase())),
    [breedOptions, breedSearch]
  )
  const visibleSellerOptions = useMemo(
    () => sellerOptions.filter((option) => String(option).toLowerCase().includes(sellerSearch.toLowerCase())),
    [sellerOptions, sellerSearch]
  )

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
    if (showBreed && selectedBreeds.length > 0) parts.push(`Breed: ${selectedBreeds.length}`)
    if (showSeller && selectedSellers.length > 0) parts.push(`Seller: ${selectedSellers.length}`)
    if (parts.length === 0) return "Filter"
    return parts.join(" | ")
  }, [selectedBreeds.length, selectedSellers.length, showBreed, showSeller])

  const toggleOption = (current, value) => {
    if (!value) return current
    if (current.includes(value)) return current.filter((item) => item !== value)
    return [...current, value]
  }

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
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-secondary" />
                  <input
                    className="w-full rounded-lg border border-primary-border/40 pl-8 pr-2 py-1.5 text-xs"
                    placeholder="Search breed"
                    value={breedSearch}
                    onChange={(e) => setBreedSearch(e.target.value)}
                  />
                  {breedSearch && (
                    <button
                      type="button"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-secondary hover:bg-primary-border/10"
                      onClick={() => setBreedSearch("")}
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
                <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-primary-border/30 p-2">
                  {visibleBreedOptions.length === 0 && <p className="text-xs text-secondary">No breeds</p>}
                  {visibleBreedOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 py-1 text-xs text-primary-text">
                      <input
                        type="checkbox"
                        checked={selectedBreeds.includes(option)}
                        onChange={() => onChange({ breed: toggleOption(selectedBreeds, option), seller: selectedSellers })}
                      />
                      <span>{toTitleCase(option)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {showSeller && (
              <div>
                <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Seller</label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-secondary" />
                  <input
                    className="w-full rounded-lg border border-primary-border/40 pl-8 pr-2 py-1.5 text-xs"
                    placeholder="Search seller"
                    value={sellerSearch}
                    onChange={(e) => setSellerSearch(e.target.value)}
                  />
                  {sellerSearch && (
                    <button
                      type="button"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-secondary hover:bg-primary-border/10"
                      onClick={() => setSellerSearch("")}
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
                <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-primary-border/30 p-2">
                  {visibleSellerOptions.length === 0 && <p className="text-xs text-secondary">No sellers</p>}
                  {visibleSellerOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 py-1 text-xs text-primary-text">
                      <input
                        type="checkbox"
                        checked={selectedSellers.includes(option)}
                        onChange={() => onChange({ breed: selectedBreeds, seller: toggleOption(selectedSellers, option) })}
                      />
                      <span>{toTitleCase(option)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              className="w-full rounded-lg border border-primary-border/40 px-3 py-2 text-xs hover:bg-primary-border/10"
              onClick={() => {
                setBreedSearch("")
                setSellerSearch("")
                onChange({ breed: [], seller: [] })
              }}
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
