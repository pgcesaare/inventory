import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import { ArrowDownOnSquareIcon } from '@heroicons/react/24/outline'

const ExportToExcel = ({table}) => {

  const handleExport = () => {
    const rows = table.getRowModel().rows.map(row => {
      const rowData = {}
      row.getVisibleCells().forEach(cell => {
        const header = cell.column.columnDef.header
        const value = cell.getValue()
        rowData[typeof header === "string" ? header : cell.column.id] = value
      })
      return rowData
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data")

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" })
    saveAs(blob, "table_data.xlsx")
  }
    return (
        <button
          title="Download Excel"
          onClick={handleExport}
          className="flex flex-row px-2 py-2 text-xs rounded-lg gap-2 text-gray-800 border border-gray-300 cursor-pointer
          hover:bg-gray-200 shadow-xs
          "
        >
          <ArrowDownOnSquareIcon className="h-4 w-4 text-gray-600 -translate-y-1/9"/>
          Export
        </button> 
    )
}

export default ExportToExcel