import { useRef } from "react"
import { CalendarDays } from "lucide-react"

const StyledDateInput = ({
  value,
  onChange,
  className = "",
  inputClassName = "",
  buttonClassName = "",
  ariaLabel = "Open date picker",
  ...props
}) => {
  const inputRef = useRef(null)

  const openDatePicker = () => {
    const input = inputRef.current
    if (!input) return
    if (typeof input.showPicker === "function") {
      input.showPicker()
      return
    }
    input.focus()
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={onChange}
        className={`w-full rounded-lg border border-primary-border/40 bg-surface px-3 pr-9 text-xs text-primary-text outline-none transition-colors focus:border-action-blue/70 focus:ring-2 focus:ring-action-blue/20 [color-scheme:light_dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer ${inputClassName}`}
        {...props}
      />
      <button
        type="button"
        onClick={openDatePicker}
        className={`absolute inset-y-0 right-0 inline-flex w-9 items-center justify-center text-secondary hover:text-primary-text ${buttonClassName}`}
        aria-label={ariaLabel}
      >
        <CalendarDays className="size-4" />
      </button>
    </div>
  )
}

export default StyledDateInput
