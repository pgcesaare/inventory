import React, { useMemo, useState } from "react"

const DEFAULT_COLUMNS = [
  { key: "visualTag", label: "Visual Tag" },
  { key: "eid", label: "EID" },
  { key: "breed", label: "Breed" },
  { key: "sex", label: "Sex" },
]

const MainDataTable = ({ title, rows = [], onRowClick, onTagClick, selectedRowKey, columns = DEFAULT_COLUMNS, filters }) => {
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" })

  const toggleSort = (key) => {
    setSortConfig((prev) => (
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    ))
  }

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return rows

    const normalize = (value) => {
      if (value === null || value === undefined || value === "") return ""
      if (typeof value === "number") return value
      if (typeof value === "boolean") return value ? 1 : 0
      if (typeof value === "string") {
        const numeric = Number(value.replace(/[^0-9.-]/g, ""))
        if (Number.isFinite(numeric) && /[0-9]/.test(value)) return numeric
        const parsedDate = Date.parse(value)
        if (!Number.isNaN(parsedDate) && /[-/]/.test(value)) return parsedDate
        return value.toLowerCase()
      }
      return String(value).toLowerCase()
    }

    const directionFactor = sortConfig.direction === "asc" ? 1 : -1

    return [...rows].sort((a, b) => {
      const aValue = normalize(a?.[sortConfig.key])
      const bValue = normalize(b?.[sortConfig.key])

      if (aValue < bValue) return -1 * directionFactor
      if (aValue > bValue) return 1 * directionFactor
      return 0
    })
  }, [rows, sortConfig])

  return (
    <div className="relative rounded-2xl border border-primary-border/30 bg-white shadow-sm overflow-visible">
      <div className="px-4 py-3 border-b border-primary-border/30">
        <h3 className="text-sm font-semibold text-primary-text">{title}</h3>
      </div>
      {filters ? (
        <div className="px-4 py-3 border-b border-primary-border/20 bg-primary-border/5">
          {filters}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-b-2xl">
        <table className="min-w-full border-collapse">
          <thead className="bg-primary-border/10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wide ${column.align === "right" ? "text-right" : "text-left"}`}
                >
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 cursor-pointer ${column.align === "right" ? "ml-auto" : ""}`}
                    onClick={() => toggleSort(column.key)}
                  >
                    {column.label}
                    <span className="text-[10px] opacity-70">
                      {sortConfig.key === column.key ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-sm text-secondary text-center"
                >
                  No data available.
                </td>
              </tr>
            )}

            {sortedRows.map((row, index) => (
              <tr
                key={`${row.visualTag}-${index}`}
                onClick={() => onRowClick && onRowClick(row)}
                className={`
                  border-t border-primary-border/20 hover:bg-primary-border/5
                  ${onRowClick ? "cursor-pointer" : ""}
                  ${selectedRowKey && selectedRowKey === (row.id || row.visualTag) ? "bg-action-blue/10" : ""}
                `}
              >
                {columns.map((column) => (
                  <td
                    key={`${column.key}-${index}`}
                    className={`px-4 py-3 text-sm text-primary-text ${column.key === "visualTag" ? "font-medium" : ""} ${column.align === "right" ? "text-right" : "text-left"}`}
                  >
                    {column.key === "visualTag" && onTagClick ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onTagClick(row)
                        }}
                        className="cursor-pointer underline decoration-primary-border/50 hover:decoration-action-blue"
                      >
                        {row[column.key] || "-"}
                      </button>
                    ) : (
                      row[column.key] || "-"
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MainDataTable
