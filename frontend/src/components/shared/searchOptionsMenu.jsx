import React, { useEffect, useRef, useState } from "react"
import { SlidersHorizontal } from "lucide-react"

const optionButtonBaseClass = "rounded-lg border px-2 py-1.5 text-xs transition-colors"

const SearchOptionsMenu = ({
  searchMode = "single",
  searchMatch = "contains",
  searchField = "all",
  fieldOptions = [
    { value: "all", label: "All" },
    { value: "visualTag", label: "Visual Tag" },
    { value: "eid", label: "EID" },
    { value: "backTag", label: "Back Tag" },
  ],
  onChange,
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

  const setMode = (mode) => onChange({ searchMode: mode, searchMatch, searchField })
  const setMatch = (match) => onChange({ searchMode, searchMatch: match, searchField })
  const setField = (field) => onChange({ searchMode, searchMatch, searchField: field })

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        className="h-full min-h-[40px] w-full inline-flex items-center justify-between gap-2 rounded-xl border border-primary-border/40 px-3 py-1.5 text-xs text-left hover:bg-primary-border/10"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="truncate">Search Type</span>
        <SlidersHorizontal className="size-4 text-secondary shrink-0" />
      </button>

      {open && (
        <div className={`absolute ${menuAlign === "right" ? "right-0 left-auto" : "left-0"} mt-2 z-30 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-primary-border/30 bg-surface p-3 shadow-lg`}>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Search Column</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {fieldOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${optionButtonBaseClass} ${
                      searchField === option.value
                        ? "border-action-blue/70 bg-action-blue/10 text-action-blue"
                        : "border-primary-border/40 hover:bg-primary-border/10"
                    }`}
                    onClick={() => setField(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Search Type</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`${optionButtonBaseClass} ${
                    searchMode === "single"
                      ? "border-action-blue/70 bg-action-blue/10 text-action-blue"
                      : "border-primary-border/40 hover:bg-primary-border/10"
                  }`}
                  onClick={() => setMode("single")}
                >
                  Single Tag
                </button>
                <button
                  type="button"
                  className={`${optionButtonBaseClass} ${
                    searchMode === "multiple"
                      ? "border-action-blue/70 bg-action-blue/10 text-action-blue"
                      : "border-primary-border/40 hover:bg-primary-border/10"
                  }`}
                  onClick={() => setMode("multiple")}
                >
                  Multiple Values
                </button>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Match Mode</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`${optionButtonBaseClass} ${
                    searchMatch === "exact"
                      ? "border-action-blue/70 bg-action-blue/10 text-action-blue"
                      : "border-primary-border/40 hover:bg-primary-border/10"
                  }`}
                  onClick={() => setMatch("exact")}
                >
                  Exact Match
                </button>
                <button
                  type="button"
                  className={`${optionButtonBaseClass} ${
                    searchMatch === "contains"
                      ? "border-action-blue/70 bg-action-blue/10 text-action-blue"
                      : "border-primary-border/40 hover:bg-primary-border/10"
                  }`}
                  onClick={() => setMatch("contains")}
                >
                  Contains
                </button>
              </div>
            </div>

            {searchMode === "multiple" && (
              <p className="text-xs text-secondary">
                Multiple values must be separated by comma.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchOptionsMenu
