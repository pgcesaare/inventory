import * as React from "react"
import { useMemo, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@lib/utils"
import { Button } from "@components/ui/button"
import { useAppContext } from "../../../context"
import MenuElementWrapper from "./menuElementWrapper"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover"

const MenuElement = ({ title, data, placeholder, onChange, field, handleReset }) => {
  const [open, setOpen] = useState(false)
  const { selected, setSelected } = useAppContext()

  const options = useMemo(() => {
    const valuesMap = {}
    data.forEach((item) => {
      const val = item[field]
      if (val) {
        const key = val.toLowerCase()
        if (!valuesMap[key]) valuesMap[key] = val
      }
    })
    return Object.values(valuesMap)
  }, [data, field])

  const handleSelect = (value) => {
    setSelected(prev => ({
        ...prev,
        [field]: value
    }))
    onChange?.(value)
    setOpen(false)
  }



  return (
      <MenuElementWrapper 
        title={title} 
        field={field}
        handleReset={handleReset}
        content={
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full flex h-8 text-sm text-gray-500"
                >
                  {selected[field] || placeholder}
                  <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search..." />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                      {options.map((option, index) => (
                        <CommandItem
                          key={index}
                          value={option}
                          onSelect={() => handleSelect(option)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selected[field] === option ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {option}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>          
        }/>
  )
}

export default MenuElement