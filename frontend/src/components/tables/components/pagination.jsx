import { ChevronRightIcon, ChevronLeftIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from "@heroicons/react/24/outline" 

const Pagination = ({ table }) => {
  const {
    getState,
    setPageIndex,
    previousPage,
    nextPage,
    getCanPreviousPage,
    getCanNextPage,
    getPageCount,
    getFilteredRowModel
  } = table

  const { pageIndex } = getState().pagination
  const totalEntries = getFilteredRowModel().rows.length

  return (
    <div className="flex flex-row justify-between border-t border-gray-200 pt-4 items-center">
      <span className="text-xs text-gray-600">
        Page {pageIndex + 1} of {getPageCount()} — <span>Showing {totalEntries} entries</span>
      </span>
      <div className="flex flex-row space-x-2">
        <button 
          onClick={() => setPageIndex(0)}   
          disabled={!getCanPreviousPage()}
          className={`border-1 rounded-lg border-gray-300 text-xs px-4 py-1 ${!getCanPreviousPage() ? " bg-gray-100 text-gray-400" : "cursor-pointer hover:bg-gray-100 text-black"}`}>
          <ChevronDoubleLeftIcon className="h-4 w-4" />
        </button>
        <button 
          onClick={() => previousPage()}
          disabled={!getCanPreviousPage()}
          className={`border-1 rounded-lg border-gray-300 text-xs px-4 py-1 ${!getCanPreviousPage() ? " bg-gray-100 text-gray-400" : "cursor-pointer hover:bg-gray-100 text-black"}`}>
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <button 
          onClick={() => nextPage()}
          disabled={!getCanNextPage()}
          className={`border-1 rounded-lg border-gray-300 text-xs px-4 py-1 ${!getCanNextPage() ? " bg-gray-100 text-gray-400" : "cursor-pointer hover:bg-gray-100 text-black"}`}>
          <ChevronRightIcon className="h-4 w-4" />
        </button>
        <button 
          onClick={() => setPageIndex(getPageCount() - 1)}
          disabled={!getCanNextPage()}
          className={`border-1 rounded-lg border-gray-300 text-xs px-4 py-1 ${!getCanNextPage() ? " bg-gray-100 text-gray-400" : "cursor-pointer hover:bg-gray-100 text-black"}`}>
          <ChevronDoubleRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default Pagination
