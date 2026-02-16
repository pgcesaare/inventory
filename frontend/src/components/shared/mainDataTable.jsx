import React, { useEffect, useMemo, useState } from "react"

const DEFAULT_COLUMNS = [
  { key: "visualTag", label: "Visual Tag" },
  { key: "eid", label: "EID" },
  { key: "breed", label: "Breed" },
  { key: "sex", label: "Sex" },
]

const MainDataTable = ({
  title,
  rows = [],
  onRowClick,
  onTagClick,
  selectedRowKey,
  columns = DEFAULT_COLUMNS,
  filters,
  enablePagination = false,
  pageSize = 50,
  cellRenderers = {},
  headerRenderers = {},
  tableClassName = "",
  headerCellClassName = "",
  bodyCellClassName = "",
  clipHorizontalOverflow = false,
  disableHorizontalScroll = false,
  defaultSortKey = "",
  defaultSortDirection = "asc",
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: defaultSortKey,
    direction: defaultSortDirection === "desc" ? "desc" : "asc",
  })
  const [currentPage, setCurrentPage] = useState(1)

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

  const parsedPageSize = pageSize === "" ? Number.NaN : Number(pageSize)
  const safePageSize = Number.isFinite(parsedPageSize)
    ? Math.max(0, Math.min(1000, parsedPageSize))
    : 15
  const effectivePageSize = safePageSize === 0 ? Math.max(1, sortedRows.length) : safePageSize
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedRows.length / effectivePageSize)),
    [sortedRows.length, effectivePageSize]
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [effectivePageSize, rows])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedRows = useMemo(() => {
    if (!enablePagination) return sortedRows
    const start = (currentPage - 1) * effectivePageSize
    const end = start + effectivePageSize
    return sortedRows.slice(start, end)
  }, [enablePagination, sortedRows, currentPage, effectivePageSize])

  const pageStart = sortedRows.length === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1
  const pageEnd = Math.min(currentPage * effectivePageSize, sortedRows.length)
  const visiblePageNumbers = useMemo(() => {
    const windowSize = 5
    const start = Math.max(1, currentPage - Math.floor(windowSize / 2))
    const end = Math.min(totalPages, start + windowSize - 1)
    const adjustedStart = Math.max(1, end - windowSize + 1)
    return Array.from({ length: end - adjustedStart + 1 }, (_, idx) => adjustedStart + idx)
  }, [currentPage, totalPages])

  return (
    <div className={`relative w-full max-w-full rounded-2xl border border-primary-border/30 bg-white shadow-sm ${clipHorizontalOverflow ? "overflow-x-hidden overflow-y-visible" : "overflow-visible"}`}>
      <div className="px-4 py-3 border-b border-primary-border/30">
        <h3 className="text-sm font-semibold text-primary-text">{title}</h3>
      </div>
      {filters ? (
        <div className="px-4 py-3 border-b border-primary-border/20 bg-primary-border/5">
          {filters}
        </div>
      ) : null}

      <div className={`w-full max-w-full rounded-b-2xl ${disableHorizontalScroll ? "overflow-x-hidden" : "overflow-x-auto"}`}>
        <table className={`min-w-full border-collapse ${tableClassName}`}>
          <thead className="bg-primary-border/10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wide ${column.align === "right" ? "text-right" : "text-left"} ${headerCellClassName}`}
                >
                  {column.sortable === false ? (
                    <div className={`inline-flex items-center gap-1 ${column.align === "right" ? "ml-auto" : ""}`}>
                      {headerRenderers?.[column.key]
                        ? headerRenderers[column.key](column)
                        : column.label}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 cursor-pointer ${column.align === "right" ? "ml-auto" : ""}`}
                      onClick={() => toggleSort(column.key)}
                    >
                      {headerRenderers?.[column.key]
                        ? headerRenderers[column.key](column)
                        : column.label}
                      <span className="text-[10px] opacity-70">
                        {sortConfig.key === column.key ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-sm text-secondary text-center"
                >
                  No data available.
                </td>
              </tr>
            )}

            {paginatedRows.map((row, index) => (
              <tr
                key={row.id || row.visualTag || `row-${index}`}
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
                    className={`px-4 py-3 text-sm text-primary-text ${column.key === "visualTag" ? "font-medium" : ""} ${column.align === "right" ? "text-right" : "text-left"} ${bodyCellClassName}`}
                  >
                    {cellRenderers?.[column.key] ? (
                      cellRenderers[column.key](row, column)
                    ) : column.key === "visualTag" && onTagClick ? (
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
      {enablePagination && (
        <div className="flex flex-col gap-2 border-t border-primary-border/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-secondary">
            Showing {pageStart}-{pageEnd} of {sortedRows.length}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className="rounded-lg border border-primary-border/40 px-2 py-1 text-xs disabled:opacity-50"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </button>
            <button
              type="button"
              className="rounded-lg border border-primary-border/40 px-2 py-1 text-xs disabled:opacity-50"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            {visiblePageNumbers.map((pageNumber) => (
              <button
                key={`page-${pageNumber}`}
                type="button"
                className={`rounded-lg border px-2 py-1 text-xs ${
                  pageNumber === currentPage
                    ? "border-action-blue/80 bg-action-blue text-white"
                    : "border-primary-border/40 hover:bg-primary-border/10"
                }`}
                onClick={() => setCurrentPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              className="rounded-lg border border-primary-border/40 px-2 py-1 text-xs disabled:opacity-50"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
            <button
              type="button"
              className="rounded-lg border border-primary-border/40 px-2 py-1 text-xs disabled:opacity-50"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MainDataTable
