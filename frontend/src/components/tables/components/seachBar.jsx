import { useState } from 'react'
import { X } from 'lucide-react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline' 

const SearchBar = ({globalFilter, setGlobalFilter}) => {

    const handleChange = (e) => {
        setGlobalFilter(e.target.value)
    }

    const handleClear = () => {
        setGlobalFilter("")
    }

    return (
         <div className="relative w-60">
            <input
                type="text"
                value={globalFilter ?? ""}
                onChange={handleChange}
                placeholder="Search"
                className="w-full px-8 py-2 shadow-xs border border-gray-300 rounded-md text-xs  focus:border-blue-300 focus:ring-1 focus:ring-blue-200 outline-none"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-800" />
            
            
        {globalFilter && (
                <button
                    type="button"
                    onClick={handleClear}
                    tabIndex={-1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                    <X className="size-4" />
                </button>
            )}
        </div>
    )
}

export default SearchBar