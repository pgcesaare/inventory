"use client"

import * as React from "react"
import { X, ChevronDownIcon } from "lucide-react"
import { Button } from "@components/ui/button"
import { Calendar } from "@components/ui/calendar"
import { Label } from "@components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover"

export default function DatePicker({ label, value, onChange }) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (selectedDate) => {
    onChange?.(selectedDate?.toISOString().split("T")[0] || "")
    setOpen(false)
  }

  const handleClear = () => {
    onChange?.("")
  }

  return (
    <div className="flex flex-col gap-2 mb-4">
      {label && (
        <Label htmlFor="datepicker" className="font-semibold text-sm text-gray-700">
          {label}
        </Label>
      )}

      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="datepicker"
              variant="outline"
              className={`
                border border-gray-300
                rounded-md
                p-2
                h-9
                text-sm
                w-full
                text-gray-600
                placeholder-gray-400
                flex justify-between items-center
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500
                focus:border-blue-500
                transition-all
                duration-150
                pr-8
              `}
            >
              {value ? new Date(value).toLocaleDateString() : "Select date"}
              <ChevronDownIcon className="ml-2 w-4 h-4" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={value ? new Date(value) : undefined}
              onSelect={handleSelect}
            />
          </PopoverContent>
        </Popover>

        {value && (
          <button
            type="button"
            onClick={handleClear}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
