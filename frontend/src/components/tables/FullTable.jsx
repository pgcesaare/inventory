import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel
} from "@tanstack/react-table"
import { useState, useEffect } from "react"
import { ChevronUpDownIcon, AdjustmentsHorizontalIcon, CalendarDateRangeIcon  } from '@heroicons/react/24/outline'
import ExportToExcel from "./components/exportToExcel"
import MenuTemplate from "./components/menuTemplate"
import MenuElement from "./components/menuElement"
import QuitButton from "../extra/quitButton"
import { useAppContext } from "../../context"
import DateFilterContent from "./components/dateFilterContent"
import Pagination from "./components/pagination"
import * as Separator from "@radix-ui/react-separator"
import SearchBar from "./components/seachBar"

function FullTable({ data, columns, sortingPriority }) {

  const [sorting, setSorting] = useState([{ id: sortingPriority, desc: false }])
  const [globalFilter, setGlobalFilter] = useState("")
  const [columnFilters, setColumnFilters] = useState([])
  const [isFilterMenu, setIsFilterMenu] = useState(false)
  const [isFilterDate, setIsFilterDate] = useState(false)
  const { selected, setSelected } = useAppContext()

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGlobalFilterFn: () => (row, columnId, filterValue) =>
      row.getValue(columnId)?.toString().toLowerCase().includes(filterValue.toLowerCase()),
    initialState: { pagination: { pageSize: 200 } }
  })

  const DeleteFilter = () => {
    table.getColumn("breed")?.setFilterValue(undefined)
    table.getColumn("seller")?.setFilterValue(undefined)
    table.getColumn("status")?.setFilterValue(undefined)
    table.getColumn("placedDate")?.setFilterValue(undefined)
    setSelected("")
    setIsFilterMenu(false)
    setIsFilterDate(false)
  }

  const tableAction = (table) => {
    table.getColumn("breed")?.setFilterValue(selected.breed)
    table.getColumn("seller")?.setFilterValue(selected.seller)
    table.getColumn("status")?.setFilterValue(selected.status)
  }

  useEffect(() => {
    table.getColumn("placedDate")?.setFilterValue({
      date: selected.date,
      dateFrom: selected.dateFrom,
      dateTo: selected.dateTo 
    })
  }, [selected.date, selected.dateFrom, selected.dateTo, table])

    const handleReset = (field) => {
        setSelected(prev => ({
        ...prev,
        [field]: ""
    }))
  }

  return (
    <div className="flex flex-col h-full justify-around">
      {/* Top controls */}
      <div className="mb-2 w-full flex flex-row justify-between items-center relative">
        <SearchBar globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} />
        <div className="flex flex-row gap-2 items-center">
          <ExportToExcel table={table} />
          <Separator.Root
            orientation="vertical"
            className="h-6 w-[1px] bg-gray-300 mx-2"
          />
          <MenuTemplate
            icon={<AdjustmentsHorizontalIcon className="h-4 w-4 text-gray-700" />}
            title="Filter"
            table={table}
            isFilter={isFilterMenu}
            setIsFilter={setIsFilterMenu}
            action={() => tableAction(table)}
            buttons={true}
            content={
              <div className="flex flex-col space-y-2">
                <MenuElement title="Breed" data={data} placeholder="Select breed" field="breed" handleReset={handleReset} />
                <MenuElement title="Sex" data={data} placeholder="Select sex" field="sex" handleReset={handleReset}/>
                <MenuElement title="Seller" data={data} placeholder="Select seller" field="seller" handleReset={handleReset}/>
                <MenuElement title="Status" data={data} placeholder="Select status" field="status" handleReset={handleReset}/>
              </div>
            }
          />
          <MenuTemplate
            icon={<CalendarDateRangeIcon className="h-4 w-4 text-gray-600" />}
            title="Date filter"
            isFilter={isFilterDate}
            setIsFilter={setIsFilterDate}
            action={tableAction}
            buttons={false}
            content={<DateFilterContent setIsFilter={setIsFilterDate} />}
          />
          {(isFilterMenu || isFilterDate) && (
            <>
              <Separator.Root
                orientation="vertical"
                className="h-6 w-[1px] bg-gray-300 mx-2"
              />            
              <QuitButton onClick={() => DeleteFilter()} />
            </>
            
          )}
        </div>
      </div>

      {/* Table container with scroll only on rows */}
      <div className="w-full rounded-lg flex items-center justify-center">
        {table.getRowModel().rows.length === 0 ? (
          <div className="text-gray-500 h-[500px] w-full text-sm py-10 scroll-y-hidden flex justify-center items-center border border-gray-300">No data found</div>
        ) : (
          <div className="w-full overflow-y-auto" style={{ maxHeight: '500px', minHeight: '500px' }}>
            <table className="min-w-full items-center rounded-lg border-collapse border border-gray-300">
              <thead className="sticky top-0 bg-gray-200 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="text-xs px-4 py-2 cursor-pointer select-none text-gray-600"
                        onClick={header.column.getToggleSortingHandler()}
                        colSpan={header.colSpan}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={`flex items-center space-x-1 ${
                              ["primaryID", "breed", "originalID", "EID"].includes(header.column.id)
                                ? "justify-start"
                                : "justify-center"
                            }`}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {({
                              asc: <ChevronUpDownIcon className="h-4 w-4 text-gray-500" />,
                              desc: <ChevronUpDownIcon className="h-4 w-4 text-gray-500" />
                            }[header.column.getIsSorted() ?? null] || "")}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-y border-gray-200 hover:bg-gray-200 h-fit cursor-pointer">
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{ textAlign: cell.column.columnDef.align || "left" }}
                        className={`text-xs px-4 py-2 text-black ${
                          cell.column.id === "primaryID" || cell.column.id === "breed"
                            ? "font-bold"
                            : ""
                        }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination table={table} />
    </div>
  )
}

export default FullTable
