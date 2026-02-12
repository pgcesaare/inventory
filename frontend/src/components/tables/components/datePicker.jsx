"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { Button } from "@components/ui/button"
import { Calendar } from "@components/ui/calendar"
import { Label } from "@components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover"
import { formatDateMMDDYYYY } from "../../../utils/dateFormat"

export default function DatePicker({ text, value, onSelect }) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (selectedDate) => {
    onSelect?.(selectedDate)
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <Label htmlFor="date" className="text-xs text-black">
        {text}
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className="w-full justify-between font-normal text-base text-gray-600"
          >
            {value ? formatDateMMDDYYYY(value, "Select date") : "Select date"}
            <ChevronDownIcon className="ml-auto"/>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
