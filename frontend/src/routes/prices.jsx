import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, CalendarRange, ChevronDown, GripVertical, Plus, Save, Search, X } from "lucide-react"
import { getRanchById, getRanches, updateRanch } from "../api/ranches"
import { getBreeds } from "../api/breeds"
import sexOptions from "../api/sex/sexOptions"
import { useToken } from "../api/useToken"
import { useAppContext } from "../context"

const normalizeStateKey = (value) => String(value || "").trim().toLowerCase()
const SEX_OPTIONS = Array.isArray(sexOptions) ? sexOptions : []
const SEX_ORDER_MAP = new Map(SEX_OPTIONS.map((item, index) => [String(item?.value || "").trim(), index]))
const VALID_SEX = new Set(SEX_OPTIONS.map((item) => String(item?.value || "").trim()))

const normalizeSexToken = (value) => {
  const raw = String(value || "").trim()
  if (!raw) return null
  if (VALID_SEX.has(raw)) return raw

  const collapsed = raw.toLowerCase().replace(/[^a-z]/g, "")
  if (collapsed === "bull") return "bull"
  if (collapsed === "heifer") return "heifer"
  if (collapsed === "steer") return "steer"
  if (collapsed === "freemartin") return "freeMartin"
  return null
}

const normalizeSexValues = (value) => {
  const tokens = Array.isArray(value)
    ? value
    : String(value || "")
      .split(/[,/&|]+/)
      .map((item) => item.trim())
      .filter(Boolean)

  const unique = new Set()
  tokens.forEach((token) => {
    const normalized = normalizeSexToken(token)
    if (normalized) unique.add(normalized)
  })

  const normalizedList = Array.from(unique)
    .sort((a, b) => {
      const aIndex = SEX_ORDER_MAP.has(a) ? SEX_ORDER_MAP.get(a) : Number.MAX_SAFE_INTEGER
      const bIndex = SEX_ORDER_MAP.has(b) ? SEX_ORDER_MAP.get(b) : Number.MAX_SAFE_INTEGER
      return aIndex - bIndex
    })

  return normalizedList.length > 0 ? normalizedList : ["bull"]
}

const serializeSexValues = (value) => normalizeSexValues(value).join(",")

const sexSummaryLabel = (value) => {
  const selected = normalizeSexValues(value)
  const labels = selected.map((item) => (
    SEX_OPTIONS.find((option) => option.value === item)?.label || item
  ))
  return labels.join(", ")
}

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const toDateInput = (value) => {
  if (!value) return ""
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  return parsed.toISOString().slice(0, 10)
}

const todayDateInput = () => new Date().toISOString().slice(0, 10)

const addDaysToDateInput = (dateInput, days) => {
  const raw = String(dateInput || "").trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return ""

  const [year, month, day] = raw.split("-").map((part) => Number(part))
  const safeDate = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(safeDate.getTime())) return ""

  safeDate.setUTCDate(safeDate.getUTCDate() + Number(days || 0))
  return safeDate.toISOString().slice(0, 10)
}

const createRowId = () => `row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const normalizeBreedValue = (value) => String(value || "").trim()

const buildSeedRowsFromBreeds = (breeds = []) => (
  Array.isArray(breeds)
    ? breeds
      .map((item) => normalizeBreedValue(item))
      .filter(Boolean)
      .map((breed) => ({ id: createRowId(), breed, sex: serializeSexValues("bull"), price: null }))
    : []
)

const createWeightRow = (columnKeys, seed = {}) => {
  const prices = {}
  columnKeys.forEach((columnKey) => {
    prices[columnKey] = toNullableNumber(seed?.prices?.[columnKey])
  })

  return {
    id: seed?.id || createRowId(),
    breed: String(seed?.breed || ""),
    sex: serializeSexValues(seed?.sex),
    prices,
  }
}

const normalizeBracketKey = (value, index) => {
  const raw = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
  return raw || `wb_${index + 1}`
}

const buildBracketLabel = (item, index) => {
  const explicitLabel = String(item?.label || "").trim()
  if (explicitLabel) return explicitLabel

  const min = item?.min
  const max = item?.max
  const hasMin = min !== null && min !== undefined && String(min) !== ""
  const hasMax = max !== null && max !== undefined && String(max) !== ""

  if (hasMin && hasMax) return `${min} lb - ${max} lb`
  if (hasMin) return `${min} lb and Up`
  if (hasMax) return `${max} lb and Under`
  return `Bracket ${index + 1}`
}

const CATEGORY_KEY_PREFIX = "cat:"
const CATEGORY_KEY_SEPARATOR = "::"
const DEFAULT_BRACKET_CATEGORY_LABEL = "General"

const parseBracketCategoryMeta = (rawKey) => {
  const safeRawKey = String(rawKey || "").trim()
  if (!safeRawKey.startsWith(CATEGORY_KEY_PREFIX)) {
    return {
      categoryLabel: DEFAULT_BRACKET_CATEGORY_LABEL,
      bracketKey: safeRawKey,
    }
  }

  const separatorIndex = safeRawKey.indexOf(CATEGORY_KEY_SEPARATOR)
  if (separatorIndex <= CATEGORY_KEY_PREFIX.length) {
    return {
      categoryLabel: DEFAULT_BRACKET_CATEGORY_LABEL,
      bracketKey: safeRawKey,
    }
  }

  const encodedCategory = safeRawKey.slice(CATEGORY_KEY_PREFIX.length, separatorIndex)
  const bracketKey = safeRawKey.slice(separatorIndex + CATEGORY_KEY_SEPARATOR.length)
  let categoryLabel = DEFAULT_BRACKET_CATEGORY_LABEL
  try {
    categoryLabel = decodeURIComponent(encodedCategory)
  } catch {
    categoryLabel = DEFAULT_BRACKET_CATEGORY_LABEL
  }

  return {
    categoryLabel: String(categoryLabel || DEFAULT_BRACKET_CATEGORY_LABEL).trim() || DEFAULT_BRACKET_CATEGORY_LABEL,
    bracketKey: String(bracketKey || "").trim(),
  }
}

const normalizeWeightBracketColumns = (weightCategories) => {
  const source = Array.isArray(weightCategories) ? weightCategories : []
  const used = new Set()

  return source.map((item, index) => {
    const sourceKey = String(item?.key || "").trim()
    const parsedMeta = parseBracketCategoryMeta(sourceKey)
    let key = normalizeBracketKey(sourceKey || item?.label, index)
    while (used.has(key)) key = `${key}_${index + 1}`
    used.add(key)

    return {
      key,
      label: buildBracketLabel(item, index),
      categoryLabel: parsedMeta.categoryLabel || DEFAULT_BRACKET_CATEGORY_LABEL,
      breeds: Array.isArray(item?.breeds)
        ? item.breeds.map((entry) => normalizeBreedValue(entry)).filter(Boolean)
        : [],
    }
  })
}

const groupWeightColumnsByCategory = (columns, rows) => {
  const sourceColumns = Array.isArray(columns) ? columns : []
  const sourceRows = Array.isArray(rows) ? rows : []
  const grouped = []
  const byCategory = new Map()

  sourceColumns.forEach((column) => {
    const categoryLabel = String(column?.categoryLabel || DEFAULT_BRACKET_CATEGORY_LABEL).trim() || DEFAULT_BRACKET_CATEGORY_LABEL
    if (!byCategory.has(categoryLabel)) {
      const nextGroup = {
        categoryLabel,
        columns: [],
        allowedBreedKeys: new Set(),
      }
      byCategory.set(categoryLabel, nextGroup)
      grouped.push(nextGroup)
    }

    const targetGroup = byCategory.get(categoryLabel)
    targetGroup.columns.push(column)
    const breedList = Array.isArray(column?.breeds) ? column.breeds : []
    breedList.forEach((breed) => {
      const normalized = normalizeBreedValue(breed).toLowerCase()
      if (normalized) targetGroup.allowedBreedKeys.add(normalized)
    })
  })

  return grouped.map((group) => {
    const hasBreedFilter = group.allowedBreedKeys.size > 0
    const filteredRows = hasBreedFilter
      ? sourceRows.filter((row) => group.allowedBreedKeys.has(normalizeBreedValue(row?.breed).toLowerCase()))
      : sourceRows

    return {
      categoryLabel: group.categoryLabel,
      columns: group.columns,
      rows: filteredRows,
    }
  })
}

const extractBreedsFromWeightCategories = (weightCategories) => {
  if (!Array.isArray(weightCategories)) return []

  const unique = new Map()
  weightCategories.forEach((item) => {
    const breeds = Array.isArray(item?.breeds) ? item.breeds : []
    breeds.forEach((breed) => {
      const value = normalizeBreedValue(breed)
      if (!value) return
      const key = value.toLowerCase()
      if (!unique.has(key)) unique.set(key, value)
    })
  })

  return Array.from(unique.values()).sort((a, b) => a.localeCompare(b))
}

const mergeUniqueBreeds = (...groups) => {
  const unique = new Map()
  groups.flat().forEach((item) => {
    const value = normalizeBreedValue(item)
    if (!value) return
    const key = value.toLowerCase()
    if (!unique.has(key)) unique.set(key, value)
  })
  return Array.from(unique.values()).sort((a, b) => a.localeCompare(b))
}

const clonePlain = (value, fallback) => {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return fallback
  }
}

const normalizeSheetData = (
  sheetData,
  weightBracketColumns,
  weightSeedBreeds = [],
  singleSeedBreeds = weightSeedBreeds
) => {
  const source = sheetData && typeof sheetData === "object" && !Array.isArray(sheetData) ? sheetData : {}
  const columnKeys = (Array.isArray(weightBracketColumns) ? weightBracketColumns : []).map((item) => item.key)

  const sourceWeightRows = Array.isArray(source.weightRows) ? source.weightRows : []
  const sourceSingleRows = Array.isArray(source.singleRows) ? source.singleRows : []

  const defaultWeightRowsFromBreeds = buildSeedRowsFromBreeds(weightSeedBreeds)
  const defaultSingleRowsFromBreeds = buildSeedRowsFromBreeds(singleSeedBreeds)
  const seedWeightRows = sourceWeightRows.length > 0
    ? sourceWeightRows
    : defaultWeightRowsFromBreeds.map((row) => ({ id: row.id, breed: row.breed, sex: row.sex, prices: {} }))

  const normalizedWeightRows = seedWeightRows.map((row) => createWeightRow(columnKeys, row))
  const weightBreedKeys = new Set(
    normalizedWeightRows
      .map((row) => normalizeBreedValue(row.breed).toLowerCase())
      .filter(Boolean)
  )
  const weightRows = [
    ...normalizedWeightRows,
    ...defaultWeightRowsFromBreeds
      .filter((row) => !weightBreedKeys.has(normalizeBreedValue(row.breed).toLowerCase()))
      .map((row) => createWeightRow(columnKeys, { breed: row.breed, sex: row.sex, prices: {} })),
  ]

  const normalizedSingleRows = (sourceSingleRows.length > 0 ? sourceSingleRows : defaultSingleRowsFromBreeds).map((row) => ({
    id: row?.id || createRowId(),
    breed: String(row?.breed || ""),
    sex: serializeSexValues(row?.sex),
    price: toNullableNumber(row?.price),
  }))
  const singleBreedKeys = new Set(
    normalizedSingleRows
      .map((row) => normalizeBreedValue(row.breed).toLowerCase())
      .filter(Boolean)
  )
  const singleRows = [
    ...normalizedSingleRows,
    ...defaultSingleRowsFromBreeds
      .filter((row) => !singleBreedKeys.has(normalizeBreedValue(row.breed).toLowerCase()))
      .map((row) => ({
        id: createRowId(),
        breed: row.breed,
        sex: row.sex,
        price: null,
      })),
  ]

  return {
    weightRows,
    singleRows,
  }
}

const normalizePricePeriods = (
  periods,
  weightBracketColumns,
  weightSeedBreeds = [],
  singleSeedBreeds = weightSeedBreeds
) => {
  const source = Array.isArray(periods) ? periods : []
  const hasWeightBrackets = Array.isArray(weightBracketColumns) && weightBracketColumns.length > 0
  const normalized = source.map((item, index) => {
    const rawLayout = String(item?.layoutMode || "").toLowerCase().trim()
    const defaultLayoutMode = hasWeightBrackets ? "weight" : "single"
    const layoutMode = hasWeightBrackets
      ? (rawLayout === "single" ? "single" : "weight")
      : "single"

    return {
      key: item?.key ? String(item.key) : `period_${index + 1}`,
      label: String(item?.label || `Period ${index + 1}`),
      startDate: toDateInput(item?.startDate),
      endDate: toDateInput(item?.endDate),
      purchasePrice: toNullableNumber(item?.purchasePrice),
      sellPrice: toNullableNumber(item?.sellPrice),
      layoutMode: rawLayout ? layoutMode : defaultLayoutMode,
      sheetData: normalizeSheetData(
        clonePlain(item?.sheetData, {}),
        weightBracketColumns,
        weightSeedBreeds,
        singleSeedBreeds
      ),
    }
  })

  return applyRollingDateRanges(normalized)
}

const createPricePeriod = (
  index = 0,
  weightBracketColumns = [],
  weightSeedBreeds = [],
  singleSeedBreeds = weightSeedBreeds
) => {
  const hasWeightBrackets = Array.isArray(weightBracketColumns) && weightBracketColumns.length > 0

  return {
    key: `period_${Date.now()}_${index}`,
    label: `Period ${index + 1}`,
    startDate: "",
    endDate: "",
    purchasePrice: null,
    sellPrice: null,
    layoutMode: hasWeightBrackets ? "weight" : "single",
    sheetData: normalizeSheetData({}, weightBracketColumns, weightSeedBreeds, singleSeedBreeds),
  }
}

const createDefaultStateConfig = () => ({
  loaded: false,
  loading: false,
  saving: false,
  hasMixed: false,
  hasMixedWeightBrackets: false,
  weightBracketColumns: [],
  seedBreedsWeight: [],
  seedBreedsSingle: [],
  baselinePeriods: [],
  periods: [],
  activePeriodKey: "",
})

const formatDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return "No dates"
  if (startDate && endDate) return `${startDate} to ${endDate}`
  if (startDate) return `From ${startDate}`
  return `Until ${endDate}`
}

const applyRollingDateRanges = (periods) => {
  const source = Array.isArray(periods) ? periods : []
  if (source.length === 0) return source

  let previousStartDate = ""
  const withAutoStarts = source.map((item) => {
    let nextStartDate = toDateInput(item?.startDate)
    if (!nextStartDate) nextStartDate = todayDateInput()
    if (previousStartDate && nextStartDate <= previousStartDate) {
      nextStartDate = addDaysToDateInput(previousStartDate, 1) || nextStartDate
    }
    previousStartDate = nextStartDate
    return {
      ...item,
      startDate: nextStartDate,
    }
  })

  return withAutoStarts.map((item, index) => ({
    ...item,
    endDate: index === withAutoStarts.length - 1
      ? ""
      : (addDaysToDateInput(withAutoStarts[index + 1]?.startDate, -1) || ""),
  }))
}

const tableInputClass = "h-8 w-full rounded-md border border-primary-border/45 bg-white/90 px-2 py-1 text-sm text-primary-text placeholder:text-secondary/70 transition-colors hover:border-primary-border/60 focus-visible:border-action-blue/60 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-action-blue/25"
const tableMoneyInputClass = `${tableInputClass} pl-6 text-right`
const tableHeadCellClass = "bg-primary-border/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-secondary"
const tableRowClass = "border-t border-primary-border/20 align-top"
const dragHandleClass = "inline-flex cursor-grab items-center rounded-md p-1 text-secondary hover:bg-primary-border/20 active:cursor-grabbing"
const tableMultiSelectInputClass = "h-8 w-full rounded-md border border-primary-border/45 bg-white/90 px-2 py-1 pr-7 text-sm text-primary-text placeholder:text-secondary/70 transition-colors hover:border-primary-border/60 focus-visible:border-action-blue/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-action-blue/25"
const tableMultiSelectMenuClass = "z-[120] rounded-md border border-primary-border/45 bg-white p-1 shadow-lg"
const tableMultiSelectOptionClass = "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-primary-text hover:bg-primary-border/10"

const SexMultiSelect = ({ value, onChange }) => {
  const selected = normalizeSexValues(value)
  const selectedSet = new Set(selected)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const menuRef = useRef(null)
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 220,
    maxHeight: 240,
    openUp: false,
  })

  const updateMenuPosition = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const gap = 6
    const viewportPadding = 8
    const viewportHeight = window.innerHeight || 0
    const viewportWidth = window.innerWidth || 0
    const spaceBelow = viewportHeight - rect.bottom - viewportPadding
    const spaceAbove = rect.top - viewportPadding
    const openUp = spaceBelow < 140 && spaceAbove > spaceBelow
    const maxHeight = Math.max(120, Math.min(260, openUp ? spaceAbove - gap : spaceBelow - gap))
    const desiredWidth = Math.max(rect.width, 220)
    const maxLeft = Math.max(viewportPadding, viewportWidth - desiredWidth - viewportPadding)
    const left = Math.min(Math.max(viewportPadding, rect.left), maxLeft)
    const top = openUp ? rect.top - gap : rect.bottom + gap

    setMenuPosition({
      top,
      left,
      width: desiredWidth,
      maxHeight,
      openUp,
    })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    updateMenuPosition()

    const handleClickOutside = (event) => {
      const inTrigger = containerRef.current?.contains(event.target)
      const inMenu = menuRef.current?.contains(event.target)
      if (!inTrigger && !inMenu) setIsOpen(false)
    }
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false)
    }
    const handleWindowLayout = () => updateMenuPosition()

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    window.addEventListener("resize", handleWindowLayout)
    window.addEventListener("scroll", handleWindowLayout, true)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
      window.removeEventListener("resize", handleWindowLayout)
      window.removeEventListener("scroll", handleWindowLayout, true)
    }
  }, [isOpen, updateMenuPosition])

  const toggleOption = (sexValue) => {
    const next = new Set(selectedSet)
    if (next.has(sexValue)) {
      if (next.size === 1) return
      next.delete(sexValue)
    } else {
      next.add(sexValue)
    }
    onChange(Array.from(next))
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        readOnly
        className={tableMultiSelectInputClass}
        value={sexSummaryLabel(selected)}
        placeholder="Select Sex"
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
      />
      <ChevronDown className={`pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`} />
      {isOpen ? createPortal(
        <div
          ref={menuRef}
          className={tableMultiSelectMenuClass}
          style={{
            position: "fixed",
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            width: `${menuPosition.width}px`,
            maxHeight: `${menuPosition.maxHeight}px`,
            overflowY: "auto",
            transform: menuPosition.openUp ? "translateY(-100%)" : "none",
          }}
        >
          {SEX_OPTIONS.map((option) => (
            <label key={option.value} className={tableMultiSelectOptionClass}>
              <input
                type="checkbox"
                checked={selectedSet.has(option.value)}
                onChange={() => toggleOption(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>,
        document.body
      ) : null}
    </div>
  )
}

const EditableWeightPriceTable = ({
  stateLabel,
  columns,
  rows,
  availableBreeds,
  onSexChange,
  onPriceChange,
  onMoveRow,
  onClearRow,
  onDeleteRow,
  onAddRow,
}) => {
  const categorySections = useMemo(() => groupWeightColumnsByCategory(columns, rows), [columns, rows])
  const breedOptions = useMemo(
    () => mergeUniqueBreeds(availableBreeds, rows.map((row) => row?.breed)),
    [availableBreeds, rows]
  )
  const sectionBreedOptionsMap = useMemo(() => {
    const next = {}
    categorySections.forEach((section, sectionIndex) => {
      const sectionKey = `${section.categoryLabel}-${sectionIndex}`
      const fromColumns = mergeUniqueBreeds(...section.columns.map((column) => column?.breeds || []))
      next[sectionKey] = fromColumns.length > 0 ? fromColumns : breedOptions
    })
    return next
  }, [categorySections, breedOptions])
  const [selectedBreedBySection, setSelectedBreedBySection] = useState({})
  const [draggingRowId, setDraggingRowId] = useState("")
  const [dragOverRowId, setDragOverRowId] = useState("")

  useEffect(() => {
    setSelectedBreedBySection((prev) => {
      const next = {}
      categorySections.forEach((section, sectionIndex) => {
        const sectionKey = `${section.categoryLabel}-${sectionIndex}`
        const sectionBreedOptions = sectionBreedOptionsMap[sectionKey] || []
        const previous = prev[sectionKey]
        next[sectionKey] = sectionBreedOptions.includes(previous) ? previous : (sectionBreedOptions[0] || "")
      })
      return next
    })
  }, [categorySections, sectionBreedOptionsMap])

  return (
    <div className="space-y-3">
      <h4 className="text-xl font-semibold text-primary-text">{stateLabel} - Prices By Weight</h4>
      {categorySections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-primary-border/40 bg-white p-4 text-sm text-secondary">
          No bracket categories found for this state.
        </div>
      ) : null}
      {categorySections.map((section, sectionIndex) => {
        const sectionKey = `${section.categoryLabel}-${sectionIndex}`
        const sectionBreedOptions = sectionBreedOptionsMap[sectionKey] || []
        const selectedBreed = selectedBreedBySection[sectionKey] || sectionBreedOptions[0] || ""
        return (
        <div key={sectionKey} className="space-y-2">
          {categorySections.length > 1 ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{section.categoryLabel}</p>
          ) : null}
          <div className="relative overflow-x-auto overflow-y-visible rounded-xl border border-primary-border/30 bg-white">
            <table className="w-full min-w-[920px] border-collapse">
              <thead>
                <tr>
                  <th className={`${tableHeadCellClass} w-[42px]`} />
                  <th className={`${tableHeadCellClass} min-w-[240px] text-left`}>Breed</th>
                  <th className={`${tableHeadCellClass} min-w-[170px] text-left`}>Sex</th>
                  {section.columns.map((column) => (
                    <th key={column.key} className={`${tableHeadCellClass} min-w-[150px] text-right`}>{column.label}</th>
                  ))}
                  <th className={`${tableHeadCellClass} w-[132px]`} />
                </tr>
              </thead>
              <tbody>
                {section.rows.length === 0 ? (
                  <tr>
                    <td colSpan={section.columns.length + 4} className="px-3 py-8 text-center text-sm text-secondary">
                      No breeds available for this category.
                    </td>
                  </tr>
                ) : (
                  section.rows.map((row) => (
                    <tr
                      key={`${section.categoryLabel}-${row.id}`}
                      className={`${tableRowClass} transition-colors ${
                        draggingRowId === row.id ? "opacity-50 bg-primary-border/15" : ""
                      } ${
                        dragOverRowId === row.id && draggingRowId && draggingRowId !== row.id ? "bg-action-blue/5" : ""
                      }`}
                      onDragOver={(event) => {
                        if (!draggingRowId) return
                        event.preventDefault()
                        if (dragOverRowId !== row.id) {
                          setDragOverRowId(row.id)
                          if (draggingRowId !== row.id) onMoveRow(draggingRowId, row.id)
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        setDraggingRowId("")
                        setDragOverRowId("")
                      }}
                    >
                      <td className="px-3 py-2 align-top">
                        <button
                          type="button"
                          draggable
                          onDragStart={(event) => {
                            setDraggingRowId(row.id)
                            setDragOverRowId(row.id)
                            if (event?.dataTransfer) {
                              event.dataTransfer.effectAllowed = "move"
                              event.dataTransfer.setData("text/plain", row.id)
                            }
                          }}
                          onDragEnd={() => {
                            setDraggingRowId("")
                            setDragOverRowId("")
                          }}
                          className={dragHandleClass}
                          title="Drag to reorder"
                          aria-label="Drag to reorder"
                        >
                          <GripVertical className="size-4" />
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <span className="block px-2 py-1 text-sm text-primary-text">{row.breed || "-"}</span>
                      </td>
                      <td className="px-3 py-2">
                        <SexMultiSelect value={row.sex} onChange={(value) => onSexChange(row.id, value)} />
                      </td>
                      {section.columns.map((column) => (
                        <td key={`${row.id}-${column.key}`} className="px-3 py-2">
                          <div className="relative">
                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-secondary">$</span>
                            <input
                              type="number"
                              step="0.01"
                              className={tableMoneyInputClass}
                              value={row.prices?.[column.key] ?? ""}
                              onChange={(event) => onPriceChange(row.id, column.key, event.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="inline-flex items-center rounded-md border border-primary-border/60 px-2 py-1 text-xs font-medium text-secondary hover:bg-primary-border/25"
                            onClick={() => onClearRow(row.id)}
                            title="Clear row"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                            onClick={() => onDeleteRow(row.id)}
                            title="Delete row"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-2">
            <select
              className="h-8 min-w-[220px] rounded-md border border-primary-border/50 bg-white px-2 text-sm text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-blue/35"
              value={selectedBreed}
              onChange={(event) => setSelectedBreedBySection((prev) => ({ ...prev, [sectionKey]: event.target.value }))}
            >
              {sectionBreedOptions.map((breed) => (
                <option key={breed} value={breed}>{breed}</option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-primary-border/60 bg-white px-3 text-xs font-medium text-primary-text hover:bg-primary-border/10 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => onAddRow(selectedBreed)}
              disabled={!selectedBreed}
            >
              <Plus className="size-3.5" />
              Add Row
            </button>
          </div>
        </div>
      )})}
    </div>
  )
}

const EditableSinglePriceTable = ({
  stateLabel,
  managerLabel,
  rows,
  availableBreeds,
  onSexChange,
  onPriceChange,
  onMoveRow,
  onClearRow,
  onDeleteRow,
  onAddRow,
}) => {
  const breedOptions = useMemo(
    () => mergeUniqueBreeds(availableBreeds, rows.map((row) => row?.breed)),
    [availableBreeds, rows]
  )
  const [selectedBreed, setSelectedBreed] = useState("")
  const [draggingRowId, setDraggingRowId] = useState("")
  const [dragOverRowId, setDragOverRowId] = useState("")

  useEffect(() => {
    if (breedOptions.length === 0) {
      setSelectedBreed("")
      return
    }
    if (!breedOptions.includes(selectedBreed)) setSelectedBreed(breedOptions[0])
  }, [breedOptions, selectedBreed])

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-xl font-semibold text-primary-text">{stateLabel}</h4>
        {managerLabel ? <p className="mt-0.5 text-sm text-secondary">{managerLabel}</p> : null}
      </div>
      <div className="relative overflow-x-auto overflow-y-visible rounded-xl border border-primary-border/30 bg-white">
        <table className="w-full min-w-[780px] border-collapse">
          <thead>
            <tr>
              <th className={`${tableHeadCellClass} w-[42px]`} />
              <th className={`${tableHeadCellClass} min-w-[260px] text-left`}>Breed</th>
              <th className={`${tableHeadCellClass} min-w-[180px] text-left`}>Sex</th>
              <th className={`${tableHeadCellClass} min-w-[160px] text-right`}>Price</th>
              <th className={`${tableHeadCellClass} w-[132px]`} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-secondary">
                  No breeds available for this layout.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`${tableRowClass} transition-colors ${
                    draggingRowId === row.id ? "opacity-50 bg-primary-border/15" : ""
                  } ${
                    dragOverRowId === row.id && draggingRowId && draggingRowId !== row.id ? "bg-action-blue/5" : ""
                  }`}
                  onDragOver={(event) => {
                    if (!draggingRowId) return
                    event.preventDefault()
                    if (dragOverRowId !== row.id) {
                      setDragOverRowId(row.id)
                      if (draggingRowId !== row.id) onMoveRow(draggingRowId, row.id)
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    setDraggingRowId("")
                    setDragOverRowId("")
                  }}
                >
                  <td className="px-3 py-2 align-top">
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        setDraggingRowId(row.id)
                        setDragOverRowId(row.id)
                        if (event?.dataTransfer) {
                          event.dataTransfer.effectAllowed = "move"
                          event.dataTransfer.setData("text/plain", row.id)
                        }
                      }}
                      onDragEnd={() => {
                        setDraggingRowId("")
                        setDragOverRowId("")
                      }}
                      className={dragHandleClass}
                      title="Drag to reorder"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical className="size-4" />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <span className="block px-2 py-1 text-sm text-primary-text">{row.breed || "-"}</span>
                  </td>
                  <td className="px-3 py-2">
                    <SexMultiSelect value={row.sex} onChange={(value) => onSexChange(row.id, value)} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-secondary">$</span>
                      <input
                        type="number"
                        step="0.01"
                        className={tableMoneyInputClass}
                        value={row.price ?? ""}
                        onChange={(event) => onPriceChange(row.id, event.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        className="inline-flex items-center rounded-md border border-primary-border/60 px-2 py-1 text-xs font-medium text-secondary hover:bg-primary-border/25"
                        onClick={() => onClearRow(row.id)}
                        title="Clear row"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        onClick={() => onDeleteRow(row.id)}
                        title="Delete row"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2">
        <select
          className="h-8 min-w-[220px] rounded-md border border-primary-border/50 bg-white px-2 text-sm text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-blue/35"
          value={selectedBreed}
          onChange={(event) => setSelectedBreed(event.target.value)}
        >
          {breedOptions.map((breed) => (
            <option key={breed} value={breed}>{breed}</option>
          ))}
        </select>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-primary-border/60 bg-white px-3 text-xs font-medium text-primary-text hover:bg-primary-border/10 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onAddRow(selectedBreed)}
          disabled={!selectedBreed}
        >
          <Plus className="size-3.5" />
          Add Row
        </button>
      </div>
    </div>
  )
}

const Prices = () => {
  const token = useToken()
  const { showSuccess, showError } = useAppContext()
  const [loadingRanches, setLoadingRanches] = useState(true)
  const [availableRanches, setAvailableRanches] = useState([])
  const [catalogBreeds, setCatalogBreeds] = useState([])
  const [stateSearch, setStateSearch] = useState("")
  const [openStateKey, setOpenStateKey] = useState("")
  const [stateConfigs, setStateConfigs] = useState({})

  const availableStates = useMemo(() => {
    const statesMap = new Map()

    availableRanches.forEach((item) => {
      const key = normalizeStateKey(item.state)
      if (!key) return

      const existing = statesMap.get(key)
      if (existing) {
        existing.ranches.push(item)
      } else {
        statesMap.set(key, {
          key,
          label: String(item.state).trim(),
          ranches: [item],
        })
      }
    })

    return Array.from(statesMap.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [availableRanches])

  const filteredStates = useMemo(() => {
    const query = String(stateSearch || "").trim().toLowerCase()
    if (!query) return availableStates
    return availableStates.filter((item) => item.label.toLowerCase().includes(query))
  }, [availableStates, stateSearch])

  const ensureStateLoaded = useCallback(async (stateKey) => {
    if (!token || !stateKey) return

    const currentConfig = stateConfigs[stateKey]
    if (currentConfig?.loading) return
    if (
      currentConfig?.loaded &&
      (
        (Array.isArray(currentConfig.seedBreedsSingle) && currentConfig.seedBreedsSingle.length > 0) ||
        catalogBreeds.length === 0
      )
    ) return

    const stateInfo = availableStates.find((item) => item.key === stateKey)
    if (!stateInfo || stateInfo.ranches.length === 0) return

    setStateConfigs((prev) => ({
      ...prev,
      [stateKey]: {
        ...(prev[stateKey] || createDefaultStateConfig()),
        loading: true,
      },
    }))

    try {
      const ranchDetails = await Promise.all(
        stateInfo.ranches.map((item) => getRanchById(item.id, token))
      )

      const bracketSets = ranchDetails.map((item) => normalizeWeightBracketColumns(item?.weightCategories))
      const bracketSignatures = bracketSets.map((items) => JSON.stringify(items))
      const hasMixedWeightBrackets = new Set(bracketSignatures).size > 1
      const sourceWeightBracketColumns = bracketSets[0] || []
      const mergedWeightCategories = ranchDetails.flatMap((item) => (
        Array.isArray(item?.weightCategories) ? item.weightCategories : []
      ))
      const sourceSeedBreedsWeight = extractBreedsFromWeightCategories(mergedWeightCategories)
      const sourceSeedBreedsSingle = mergeUniqueBreeds(catalogBreeds)

      const normalizedPeriodsByRanch = ranchDetails.map((item) => (
        normalizePricePeriods(
          item?.pricePeriods,
          sourceWeightBracketColumns,
          sourceSeedBreedsWeight,
          sourceSeedBreedsSingle
        )
      ))
      const periodSignatures = normalizedPeriodsByRanch.map((items) => JSON.stringify(items))
      const hasMixedPeriods = new Set(periodSignatures).size > 1
      const sourcePeriods = normalizedPeriodsByRanch[0] || []

      setStateConfigs((prev) => ({
        ...prev,
        [stateKey]: {
          loaded: true,
          loading: false,
          saving: false,
          hasMixed: hasMixedPeriods || hasMixedWeightBrackets,
          hasMixedWeightBrackets,
          weightBracketColumns: sourceWeightBracketColumns,
          seedBreedsWeight: sourceSeedBreedsWeight,
          seedBreedsSingle: sourceSeedBreedsSingle,
          baselinePeriods: sourcePeriods,
          periods: sourcePeriods,
          activePeriodKey: sourcePeriods[0]?.key || "",
        },
      }))
    } catch (error) {
      console.error("Error loading prices by state:", error)
      showError("Could not load prices for this state.")
      setStateConfigs((prev) => ({
        ...prev,
        [stateKey]: {
          ...(prev[stateKey] || createDefaultStateConfig()),
          loaded: true,
          loading: false,
        },
      }))
    }
  }, [token, stateConfigs, availableStates, showError, catalogBreeds])

  useEffect(() => {
    if (!token) return

    const fetchRanches = async () => {
      try {
        setLoadingRanches(true)
        const data = await getRanches(token)
        setAvailableRanches(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Error loading ranches for prices:", error)
        showError("Could not load ranches.")
      } finally {
        setLoadingRanches(false)
      }
    }

    fetchRanches()
  }, [token, showError])

  useEffect(() => {
    if (!token) return

    const fetchCatalogBreeds = async () => {
      try {
        const data = await getBreeds(token)
        const names = Array.isArray(data)
          ? data
            .map((item) => normalizeBreedValue(item?.name))
            .filter(Boolean)
          : []
        setCatalogBreeds(mergeUniqueBreeds(names))
      } catch (error) {
        console.error("Error loading breed catalog for prices:", error)
      }
    }

    fetchCatalogBreeds()
  }, [token])

  useEffect(() => {
    if (!openStateKey) return
    if (!Array.isArray(catalogBreeds) || catalogBreeds.length === 0) return
    ensureStateLoaded(openStateKey)
  }, [openStateKey, catalogBreeds, ensureStateLoaded])

  const hasChanges = (stateKey) => {
    const config = stateConfigs[stateKey]
    if (!config) return false

    const baseline = JSON.stringify(normalizePricePeriods(
      config.baselinePeriods,
      config.weightBracketColumns,
      config.seedBreedsWeight,
      config.seedBreedsSingle
    ))
    const current = JSON.stringify(normalizePricePeriods(
      config.periods,
      config.weightBracketColumns,
      config.seedBreedsWeight,
      config.seedBreedsSingle
    ))
    return baseline !== current
  }

  const updatePeriod = (stateKey, periodKey, updater, options = {}) => {
    const { applyDateRanges = false } = options
    setStateConfigs((prev) => {
      const current = prev[stateKey]
      if (!current || !current.loaded) return prev

      const mappedPeriods = (current.periods || []).map((period) => (
        period.key === periodKey ? updater(period) : period
      ))
      const nextPeriods = applyDateRanges ? applyRollingDateRanges(mappedPeriods) : mappedPeriods

      return {
        ...prev,
        [stateKey]: {
          ...current,
          periods: nextPeriods,
        },
      }
    })
  }

  const setPeriodField = (stateKey, periodKey, field, value) => {
    updatePeriod(stateKey, periodKey, (period) => ({
      ...period,
      [field]: field === "purchasePrice" || field === "sellPrice" ? toNullableNumber(value) : value,
    }), { applyDateRanges: field === "startDate" })
  }

  const setPeriodLayoutMode = (stateKey, periodKey, mode) => {
    setStateConfigs((prev) => {
      const current = prev[stateKey]
      if (!current || !current.loaded) return prev

      const hasWeightBrackets = Array.isArray(current.weightBracketColumns) && current.weightBracketColumns.length > 0
      const safeMode = hasWeightBrackets ? (mode === "single" ? "single" : "weight") : "single"

      const nextPeriods = (current.periods || []).map((period) => (
        period.key === periodKey
          ? { ...period, layoutMode: safeMode }
          : period
      ))

      return {
        ...prev,
        [stateKey]: {
          ...current,
          periods: nextPeriods,
        },
      }
    })
  }

  const addPeriod = (stateKey) => {
    setStateConfigs((prev) => {
      const current = prev[stateKey]
      if (!current || !current.loaded) return prev

      const appended = [...(current.periods || []), createPricePeriod(
        (current.periods || []).length,
        current.weightBracketColumns,
        current.seedBreedsWeight,
        current.seedBreedsSingle
      )]
      const next = applyRollingDateRanges(appended)
      const last = next[next.length - 1]

      return {
        ...prev,
        [stateKey]: {
          ...current,
          periods: next,
          activePeriodKey: last?.key || "",
        },
      }
    })
  }

  const removePeriod = (stateKey, periodKey) => {
    setStateConfigs((prev) => {
      const current = prev[stateKey]
      if (!current || !current.loaded) return prev

      const remaining = applyRollingDateRanges((current.periods || []).filter((item) => item.key !== periodKey))
      const nextActive = current.activePeriodKey === periodKey
        ? (remaining[0]?.key || "")
        : current.activePeriodKey

      return {
        ...prev,
        [stateKey]: {
          ...current,
          periods: remaining,
          activePeriodKey: nextActive,
        },
      }
    })
  }

  const setWeightRowField = (stateKey, periodKey, rowId, field, value) => {
    updatePeriod(stateKey, periodKey, (period) => {
      const sheetData = normalizeSheetData(
        period.sheetData,
        stateConfigs[stateKey]?.weightBracketColumns || [],
        stateConfigs[stateKey]?.seedBreedsWeight || [],
        stateConfigs[stateKey]?.seedBreedsSingle || []
      )
      const weightRows = sheetData.weightRows.map((row) => (
        row.id === rowId
          ? { ...row, [field]: field === "sex" ? serializeSexValues(value) : value }
          : row
      ))
      return {
        ...period,
        sheetData: {
          ...sheetData,
          weightRows,
        },
      }
    })
  }

  const setWeightRowPrice = (stateKey, periodKey, rowId, columnKey, value) => {
    updatePeriod(stateKey, periodKey, (period) => {
      const sheetData = normalizeSheetData(
        period.sheetData,
        stateConfigs[stateKey]?.weightBracketColumns || [],
        stateConfigs[stateKey]?.seedBreedsWeight || [],
        stateConfigs[stateKey]?.seedBreedsSingle || []
      )
      const weightRows = sheetData.weightRows.map((row) => (
        row.id === rowId
          ? {
            ...row,
            prices: {
              ...(row.prices || {}),
              [columnKey]: toNullableNumber(value),
            },
          }
          : row
      ))
      return {
        ...period,
        sheetData: {
          ...sheetData,
          weightRows,
        },
      }
    })
  }

  const moveWeightRow = (stateKey, periodKey, sourceRowId, targetRowId) => {
    if (!sourceRowId || !targetRowId || sourceRowId === targetRowId) return
    updatePeriod(stateKey, periodKey, (period) => {
      const columns = stateConfigs[stateKey]?.weightBracketColumns || []
      const sheetData = normalizeSheetData(
        period.sheetData,
        columns,
        stateConfigs[stateKey]?.seedBreedsWeight || [],
        stateConfigs[stateKey]?.seedBreedsSingle || []
      )
      const nextRows = [...sheetData.weightRows]
      const sourceIndex = nextRows.findIndex((row) => row.id === sourceRowId)
      const targetIndex = nextRows.findIndex((row) => row.id === targetRowId)
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return period

      const [moved] = nextRows.splice(sourceIndex, 1)
      nextRows.splice(targetIndex, 0, moved)

      return {
        ...period,
        sheetData: {
          ...sheetData,
          weightRows: nextRows,
        },
      }
    })
  }

  const clearWeightRow = (stateKey, periodKey, rowId) => {
    updatePeriod(stateKey, periodKey, (period) => {
      const columns = stateConfigs[stateKey]?.weightBracketColumns || []
      const sheetData = normalizeSheetData(
        period.sheetData,
        columns,
        stateConfigs[stateKey]?.seedBreedsWeight || [],
        stateConfigs[stateKey]?.seedBreedsSingle || []
      )
      const columnKeys = columns.map((column) => column.key)
      return {
        ...period,
        sheetData: {
          ...sheetData,
          weightRows: sheetData.weightRows.map((row) => {
            if (row.id !== rowId) return row
            const priceKeys = new Set([...(Object.keys(row.prices || {})), ...columnKeys])
            const clearedPrices = {}
            priceKeys.forEach((key) => {
              clearedPrices[key] = null
            })
            return {
              ...row,
              sex: serializeSexValues("bull"),
              prices: clearedPrices,
            }
          }),
        },
      }
    })
  }

  const deleteWeightRow = (stateKey, periodKey, rowId) => {
    updatePeriod(stateKey, periodKey, (period) => {
      const columns = stateConfigs[stateKey]?.weightBracketColumns || []
      const sheetData = normalizeSheetData(
        period.sheetData,
        columns,
        stateConfigs[stateKey]?.seedBreedsWeight || [],
        stateConfigs[stateKey]?.seedBreedsSingle || []
      )
      return {
        ...period,
        sheetData: {
          ...sheetData,
          weightRows: sheetData.weightRows.filter((row) => row.id !== rowId),
        },
      }
    })
  }

  const addWeightRow = (stateKey, periodKey, breed) => {
    const nextBreed = normalizeBreedValue(breed)
    if (!nextBreed) return

    updatePeriod(stateKey, periodKey, (period) => {
      const columns = stateConfigs[stateKey]?.weightBracketColumns || []
      const sheetData = normalizeSheetData(
        period.sheetData,
        columns,
        stateConfigs[stateKey]?.seedBreedsWeight || [],
        stateConfigs[stateKey]?.seedBreedsSingle || []
      )
      const nextPrices = {}
      columns.forEach((column) => {
        nextPrices[column.key] = null
      })
      return {
        ...period,
        sheetData: {
          ...sheetData,
          weightRows: [
            ...sheetData.weightRows,
            {
              id: createRowId(),
              breed: nextBreed,
              sex: serializeSexValues("bull"),
              prices: nextPrices,
            },
          ],
        },
      }
    })
  }

  const setSingleRowField = (stateKey, periodKey, rowId, field, value) => {
    updatePeriod(stateKey, periodKey, (period) => {
      const sheetData = normalizeSheetData(
        period.sheetData,
        stateConfigs[stateKey]?.weightBracketColumns || [],
        stateConfigs[stateKey]?.seedBreedsWeight || [],
        stateConfigs[stateKey]?.seedBreedsSingle || []
      )
      const singleRows = sheetData.singleRows.map((row) => (
        row.id === rowId
          ? {
            ...row,
            [field]: field === "price"
              ? toNullableNumber(value)
              : (field === "sex" ? serializeSexValues(value) : value),
          }
          : row
      ))
      return {
        ...period,
        sheetData: {
          ...sheetData,
          singleRows,
        },
      }
    })
  }

  const moveSingleRow = (stateKey, periodKey, sourceRowId, targetRowId) => {
    if (!sourceRowId || !targetRowId || sourceRowId === targetRowId) return
    updatePeriod(stateKey, periodKey, (period) => {
      const sheetData = normalizeSheetData(
        period.sheetData,
        stateConfigs[stateKey]?.weightBracketColumns || [],
        stateConfigs[stateKey]?.seedBreedsWeight || [],
        stateConfigs[stateKey]?.seedBreedsSingle || []
      )
      const nextRows = [...sheetData.singleRows]
      const sourceIndex = nextRows.findIndex((row) => row.id === sourceRowId)
      const targetIndex = nextRows.findIndex((row) => row.id === targetRowId)
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return period

      const [moved] = nextRows.splice(sourceIndex, 1)
      nextRows.splice(targetIndex, 0, moved)

      return {
        ...period,
        sheetData: {
          ...sheetData,
          singleRows: nextRows,
        },
      }
    })
  }

  const clearSingleRow = (stateKey, periodKey, rowId) => {
    updatePeriod(stateKey, periodKey, (period) => {
      const sheetData = normalizeSheetData(
        period.sheetData,
        stateConfigs[stateKey]?.weightBracketColumns || [],
        stateConfigs[stateKey]?.seedBreedsWeight || [],
        stateConfigs[stateKey]?.seedBreedsSingle || []
      )
      return {
        ...period,
        sheetData: {
          ...sheetData,
          singleRows: sheetData.singleRows.map((row) => (
            row.id === rowId
              ? {
                ...row,
                sex: serializeSexValues("bull"),
                price: null,
              }
              : row
          )),
        },
      }
    })
  }

  const deleteSingleRow = (stateKey, periodKey, rowId) => {
    updatePeriod(stateKey, periodKey, (period) => {
      const sheetData = normalizeSheetData(
        period.sheetData,
        stateConfigs[stateKey]?.weightBracketColumns || [],
        stateConfigs[stateKey]?.seedBreedsWeight || [],
        stateConfigs[stateKey]?.seedBreedsSingle || []
      )
      return {
        ...period,
        sheetData: {
          ...sheetData,
          singleRows: sheetData.singleRows.filter((row) => row.id !== rowId),
        },
      }
    })
  }

  const addSingleRow = (stateKey, periodKey, breed) => {
    const nextBreed = normalizeBreedValue(breed)
    if (!nextBreed) return

    updatePeriod(stateKey, periodKey, (period) => {
      const sheetData = normalizeSheetData(
        period.sheetData,
        stateConfigs[stateKey]?.weightBracketColumns || [],
        stateConfigs[stateKey]?.seedBreedsWeight || [],
        stateConfigs[stateKey]?.seedBreedsSingle || []
      )
      return {
        ...period,
        sheetData: {
          ...sheetData,
          singleRows: [
            ...sheetData.singleRows,
            {
              id: createRowId(),
              breed: nextBreed,
              sex: serializeSexValues("bull"),
              price: null,
            },
          ],
        },
      }
    })
  }

  const toggleStatePanel = async (stateKey) => {
    if (!stateKey) return
    const nextKey = openStateKey === stateKey ? "" : stateKey
    setOpenStateKey(nextKey)
    if (nextKey) await ensureStateLoaded(nextKey)
  }

  const saveStatePrices = async (stateKey) => {
    if (!token || !stateKey) return

    const config = stateConfigs[stateKey]
    const stateInfo = availableStates.find((item) => item.key === stateKey)
    if (!config || !stateInfo || !Array.isArray(stateInfo.ranches) || stateInfo.ranches.length === 0) return

    const normalizedPeriods = normalizePricePeriods(
      config.periods,
      config.weightBracketColumns,
      config.seedBreedsWeight,
      config.seedBreedsSingle
    )

    setStateConfigs((prev) => ({
      ...prev,
      [stateKey]: {
        ...prev[stateKey],
        saving: true,
      },
    }))

    try {
      // State-level layouts are synchronized in backend. One save updates all ranches in the state.
      await updateRanch(stateInfo.ranches[0].id, { pricePeriods: normalizedPeriods }, token)

      setStateConfigs((prev) => ({
        ...prev,
        [stateKey]: {
          ...prev[stateKey],
          saving: false,
          hasMixed: false,
          baselinePeriods: normalizedPeriods,
          periods: normalizedPeriods,
        },
      }))

      showSuccess(`Prices saved for ${stateInfo.label}.`, "Saved")
    } catch (error) {
      console.error("Error saving prices by state:", error)
      showError(error?.response?.data?.message || "Could not save prices for this state.")
      setStateConfigs((prev) => ({
        ...prev,
        [stateKey]: {
          ...prev[stateKey],
          saving: false,
        },
      }))
    }
  }

  return (
    <div className="w-full p-4 md:p-6 space-y-5">
      <div className="flex w-full flex-col gap-5">
        <div className="rounded-2xl border border-primary-border/60 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-secondary">Catalogs</p>
              <h2 className="mt-1 text-xl font-semibold text-primary-text">Prices By State</h2>
              <p className="mt-1 text-sm text-secondary">
                Configure editable price sheets by period. Weight view follows the state brackets.
              </p>
            </div>
            <div className="rounded-xl border border-primary-border/60 bg-primary-border/10 px-3 py-2 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Available States</p>
              <p className="text-lg font-semibold text-primary-text">{availableStates.length}</p>
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
            <input
              className="w-full rounded-lg border border-primary-border/50 bg-white py-2 pl-9 pr-10 text-sm text-primary-text placeholder:text-secondary/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-blue/35"
              placeholder="Search state..."
              value={stateSearch}
              onChange={(event) => setStateSearch(event.target.value)}
            />
            {stateSearch ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-secondary transition hover:bg-primary-border/20 hover:text-primary-text"
                onClick={() => setStateSearch("")}
                title="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        {loadingRanches ? (
          <div className="rounded-2xl border border-primary-border/60 bg-white p-5 shadow-sm">
            <p className="text-xs text-secondary">Loading states...</p>
          </div>
        ) : filteredStates.length === 0 ? (
          <div className="rounded-2xl border border-primary-border/60 bg-white p-5 shadow-sm">
            <p className="text-xs text-secondary">No states available.</p>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-primary-border/60 bg-white p-5 shadow-sm">
            {filteredStates.map((stateItem) => {
              const config = stateConfigs[stateItem.key] || createDefaultStateConfig()
              const isOpen = openStateKey === stateItem.key
              const stateHasChanges = hasChanges(stateItem.key)
              const canSaveState = stateHasChanges || config.hasMixed || config.hasMixedWeightBrackets
              const periods = Array.isArray(config.periods) ? config.periods : []
              const activePeriod = periods.find((item) => item.key === config.activePeriodKey) || periods[0] || null
              const hasWeightBrackets = Array.isArray(config.weightBracketColumns) && config.weightBracketColumns.length > 0
              const activeLayoutMode = activePeriod?.layoutMode || (hasWeightBrackets ? "weight" : "single")
              const activeSheetData = normalizeSheetData(
                activePeriod?.sheetData,
                config.weightBracketColumns,
                config.seedBreedsWeight,
                config.seedBreedsSingle
              )

              return (
                <div
                  key={stateItem.key}
                  className={`rounded-xl border border-primary-border/60 bg-primary-border/5 p-4 space-y-3 transition ${
                    isOpen ? "ring-1 ring-action-blue/30" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary-text">{stateItem.label}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="rounded-full border border-primary-border/50 bg-primary-border/10 px-2 py-0.5 text-secondary">
                          {stateItem.ranches.length} ranch{stateItem.ranches.length === 1 ? "" : "es"}
                        </span>
                        <span className="rounded-full border border-primary-border/50 bg-primary-border/10 px-2 py-0.5 text-secondary">
                          {periods.length} period{periods.length === 1 ? "" : "s"}
                        </span>
                        {stateHasChanges ? (
                          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
                            Unsaved Changes
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg border border-primary-border/60 bg-white px-3 py-1.5 text-xs hover:bg-primary-border/15"
                      onClick={() => toggleStatePanel(stateItem.key)}
                    >
                      {isOpen ? "Close" : "Manage"}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="space-y-4 border-t border-primary-border/40 pt-3">
                      {config.loading ? (
                        <p className="text-xs text-secondary">Loading prices...</p>
                      ) : (
                        <div className="space-y-4">
                          {config.hasMixed && (
                            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                              <p>
                                Ranches in this state share one prices layout. Saving here applies the same configuration to every ranch in {stateItem.label}.
                              </p>
                            </div>
                          )}

                          {config.hasMixedWeightBrackets && (
                            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                              <p>
                                Weight brackets will be standardized by state when you save.
                              </p>
                            </div>
                          )}

                          <div className="rounded-xl border border-primary-border/55 bg-primary-border/5 p-3">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Periods</p>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg border border-primary-border/60 bg-white px-3 py-1.5 text-xs font-medium text-primary-text hover:bg-primary-border/10"
                                onClick={() => addPeriod(stateItem.key)}
                              >
                                <Plus className="size-3.5" />
                                Add Period
                              </button>
                            </div>
                            <div className="overflow-x-auto">
                              <div className="inline-flex min-w-full flex-nowrap gap-2 pb-1">
                                {periods.map((period) => {
                                  const isActive = activePeriod?.key === period.key
                                  return (
                                    <button
                                      key={`${stateItem.key}-${period.key}`}
                                      type="button"
                                      className={`min-w-[170px] rounded-lg border px-3 py-2 text-left text-xs transition ${
                                        isActive
                                          ? "border-action-blue/70 bg-action-blue/10 text-action-blue"
                                          : "border-primary-border/45 bg-white text-primary-text hover:bg-primary-border/10"
                                      }`}
                                      onClick={() => setStateConfigs((prev) => ({
                                        ...prev,
                                        [stateItem.key]: {
                                          ...(prev[stateItem.key] || createDefaultStateConfig()),
                                          activePeriodKey: period.key,
                                        },
                                      }))}
                                    >
                                      <p className="font-semibold">{period.label || "Period"}</p>
                                      <p className="mt-0.5 text-[11px] opacity-80">{formatDateRange(period.startDate, period.endDate)}</p>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </div>

                          {activePeriod ? (
                            <div className="rounded-xl border border-primary-border/55 bg-primary-border/5 p-4">
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="md:col-span-2">
                                  <label className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Period Label</label>
                                  <input
                                    className="mt-1 w-full rounded-lg border border-primary-border/50 bg-white px-3 py-2 text-sm text-primary-text placeholder:text-secondary/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-blue/35"
                                    value={activePeriod.label}
                                    onChange={(event) => setPeriodField(stateItem.key, activePeriod.key, "label", event.target.value)}
                                    placeholder="e.g. Summer 2026"
                                  />
                                </div>
                                <div>
                                  <label className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">
                                    <CalendarRange className="size-3.5" />
                                    Start Date
                                  </label>
                                  <input
                                    type="date"
                                    className="mt-1 w-full rounded-lg border border-primary-border/50 bg-white px-3 py-2 text-sm text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-blue/35"
                                    value={activePeriod.startDate || ""}
                                    onChange={(event) => setPeriodField(stateItem.key, activePeriod.key, "startDate", event.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">
                                    <CalendarRange className="size-3.5" />
                                    End Date (Auto)
                                  </label>
                                  <input
                                    type="date"
                                    className="mt-1 w-full rounded-lg border border-primary-border/50 bg-primary-border/10 px-3 py-2 text-sm text-secondary"
                                    value={activePeriod.endDate || ""}
                                    disabled
                                    readOnly
                                  />
                                  <p className="mt-1 text-[11px] text-secondary">Open-ended until the next period starts.</p>
                                </div>
                                <div className="md:col-span-2 space-x-2">
                                  <label className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Price Sheet Layout</label>
                                  <div className="mt-1 inline-flex rounded-lg border border-primary-border/50 bg-white p-1">
                                    <button
                                      type="button"
                                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                        activeLayoutMode === "weight"
                                          ? "bg-action-blue text-white"
                                          : "text-primary-text hover:bg-primary-border/10"
                                      } ${!hasWeightBrackets ? "opacity-50" : ""}`}
                                      disabled={!hasWeightBrackets}
                                      onClick={() => setPeriodLayoutMode(stateItem.key, activePeriod.key, "weight")}
                                    >
                                      By Weight
                                    </button>
                                    <button
                                      type="button"
                                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                        activeLayoutMode === "single"
                                          ? "bg-action-blue text-white"
                                          : "text-primary-text hover:bg-primary-border/10"
                                      }`}
                                      onClick={() => setPeriodLayoutMode(stateItem.key, activePeriod.key, "single")}
                                    >
                                      Single Price
                                    </button>
                                  </div>
                                  {!hasWeightBrackets && (
                                    <p className="mt-1 text-[11px] text-secondary">No weight brackets found for this state. Defaulting to Single Price.</p>
                                  )}
                                </div>
                              </div>

                              <div className="rounded-xl border border-primary-border/55 bg-white p-3">
                                {activeLayoutMode === "weight" && hasWeightBrackets ? (
                                  <EditableWeightPriceTable
                                    stateLabel={stateItem.label}
                                    columns={config.weightBracketColumns}
                                    rows={activeSheetData.weightRows}
                                    availableBreeds={config.seedBreedsWeight}
                                    onSexChange={(rowId, value) => setWeightRowField(stateItem.key, activePeriod.key, rowId, "sex", value)}
                                    onPriceChange={(rowId, columnKey, value) => setWeightRowPrice(stateItem.key, activePeriod.key, rowId, columnKey, value)}
                                    onMoveRow={(sourceRowId, targetRowId) => moveWeightRow(stateItem.key, activePeriod.key, sourceRowId, targetRowId)}
                                    onClearRow={(rowId) => clearWeightRow(stateItem.key, activePeriod.key, rowId)}
                                    onDeleteRow={(rowId) => deleteWeightRow(stateItem.key, activePeriod.key, rowId)}
                                    onAddRow={(breed) => addWeightRow(stateItem.key, activePeriod.key, breed)}
                                  />
                                ) : (
                                  <EditableSinglePriceTable
                                    stateLabel={stateItem.label}
                                    managerLabel={stateItem.ranches[0]?.manager || ""}
                                    rows={activeSheetData.singleRows}
                                    availableBreeds={config.seedBreedsSingle}
                                    onSexChange={(rowId, value) => setSingleRowField(stateItem.key, activePeriod.key, rowId, "sex", value)}
                                    onPriceChange={(rowId, value) => setSingleRowField(stateItem.key, activePeriod.key, rowId, "price", value)}
                                    onMoveRow={(sourceRowId, targetRowId) => moveSingleRow(stateItem.key, activePeriod.key, sourceRowId, targetRowId)}
                                    onClearRow={(rowId) => clearSingleRow(stateItem.key, activePeriod.key, rowId)}
                                    onDeleteRow={(rowId) => deleteSingleRow(stateItem.key, activePeriod.key, rowId)}
                                    onAddRow={(breed) => addSingleRow(stateItem.key, activePeriod.key, breed)}
                                  />
                                )}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary-border/35 pt-3">
                                <button
                                  type="button"
                                  className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                                  onClick={() => removePeriod(stateItem.key, activePeriod.key)}
                                >
                                  Remove This Period
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-lg border border-action-blue/80 bg-action-blue px-3 py-2 text-xs font-semibold text-white hover:bg-action-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
                                  onClick={() => saveStatePrices(stateItem.key)}
                                  disabled={config.saving || !canSaveState}
                                >
                                  <Save className="size-3.5" />
                                  {config.saving ? "Saving..." : `Save ${stateItem.label}`}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-primary-border/50 p-4 text-sm text-secondary">
                              <p>No periods yet. Click <span className="font-semibold">Add Period</span> to create one.</p>
                              <div className="mt-3 flex justify-end">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-lg border border-action-blue/80 bg-action-blue px-3 py-2 text-xs font-semibold text-white hover:bg-action-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
                                  onClick={() => saveStatePrices(stateItem.key)}
                                  disabled={config.saving || !canSaveState}
                                >
                                  <Save className="size-3.5" />
                                  {config.saving ? "Saving..." : `Save ${stateItem.label}`}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Prices
