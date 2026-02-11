import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel
} from "@tanstack/react-table";

function BasicTable({ data, columns }) {
  // Initialize the table instance with data, columns, and row model
  const table = useReactTable({
    data, // The data to be displayed in the table
    columns, // Column definitions
    getCoreRowModel: getCoreRowModel(), // Method to compute rows based on core data
    getPaginationRowModel: getPaginationRowModel()
  });

  return (
    <div className="w-full h-full">
      {/* Render the table */}
      <table className="border border-gray-300 rounded-lg w-full">
        <thead> 
          {/* Render table headers */}
          {table.getHeaderGroups().map((headerGroup) => (
            <tr 
              key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th colSpan={header.colSpan} key={header.id}>
                  {/* Render header content or leave blank if it's a placeholder */}
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header, // Header definition
                        header.getContext() // Context for the header
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {/* Render table rows */}
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {/* Render each cell's content */}
                  {flexRender(
                    cell.column.columnDef.cell, // Cell definition
                    cell.getContext() // Context for the cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BasicTable