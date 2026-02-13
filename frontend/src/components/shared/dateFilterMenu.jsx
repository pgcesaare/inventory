import React, { useMemo, useRef, useState, useEffect } from "react"
import { CalendarDays } from "lucide-react"
import { formatDateMMDDYYYY } from "../../utils/dateFormat"
import StyledDateInput from "./styledDateInput"

const toISODate = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const DateFilterMenu = ({ dateFrom, dateTo, onChange, className = "", menuAlign = "left" }) => {
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
    const fromLabel = formatDateMMDDYYYY(dateFrom, "")
    const toLabel = formatDateMMDDYYYY(dateTo, "")
    if (dateFrom && dateTo && dateFrom === dateTo) return `Date: ${fromLabel}`
    if (dateFrom && dateTo) return `${fromLabel} to ${toLabel}`
    if (dateFrom) return `From ${fromLabel}`
    if (dateTo) return `Until ${toLabel}`
    return "Date filter"
  }, [dateFrom, dateTo])

  const setRange = (from, to) => {
    onChange({ from, to })
  }

  const setSingleDate = (value) => {
    setRange(value || "", value || "")
  }

  const applyToday = () => {
    const today = toISODate(new Date())
    setRange(today, today)
  }

  const applyThisWeek = () => {
    const now = new Date()
    const start = new Date(now)
    const day = now.getDay() // Sunday=0, Monday=1, ... Saturday=6
    const daysSinceMonday = day === 0 ? 6 : day - 1
    start.setDate(now.getDate() - daysSinceMonday)
    setRange(toISODate(start), toISODate(now))
  }

  const applyThisMonth = () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    setRange(toISODate(start), toISODate(now))
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        className="h-full min-h-[40px] w-full inline-flex items-center justify-between gap-2 rounded-xl border border-primary-border/40 px-3 py-1.5 text-xs text-left hover:bg-primary-border/10"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="truncate">{label}</span>
        <CalendarDays className="size-4 text-secondary shrink-0" />
      </button>

      {open && (
        <div className={`absolute ${menuAlign === "right" ? "right-0 left-auto" : "left-0"} mt-2 z-30 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-primary-border/30 bg-surface p-3 shadow-lg`}>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button type="button" className="rounded-lg border border-primary-border/40 px-2 py-1.5 text-xs hover:bg-primary-border/10" onClick={applyToday}>Today</button>
            <button type="button" className="rounded-lg border border-primary-border/40 px-2 py-1.5 text-xs hover:bg-primary-border/10" onClick={applyThisWeek}>This week</button>
            <button type="button" className="rounded-lg border border-primary-border/40 px-2 py-1.5 text-xs hover:bg-primary-border/10" onClick={applyThisMonth}>This month</button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Single Date</label>
              <StyledDateInput
                className="mt-1"
                inputClassName="h-[36px]"
                value={dateFrom && dateFrom === dateTo ? dateFrom : ""}
                onChange={(e) => setSingleDate(e.target.value)}
                ariaLabel="Open single date picker"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">From</label>
                <StyledDateInput
                  className="mt-1"
                  inputClassName="h-[36px]"
                  value={dateFrom || ""}
                  onChange={(e) => setRange(e.target.value, dateTo || "")}
                  ariaLabel="Open from date picker"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">To</label>
                <StyledDateInput
                  className="mt-1"
                  inputClassName="h-[36px]"
                  value={dateTo || ""}
                  onChange={(e) => setRange(dateFrom || "", e.target.value)}
                  ariaLabel="Open to date picker"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DateFilterMenu
