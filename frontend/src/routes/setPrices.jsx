import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { AlertTriangle, CheckCircle2, RefreshCcw, Search, Sparkles, X } from "lucide-react"
import { useToken } from "../api/useToken"
import { getRanchById } from "../api/ranches"
import { getInventoryByRanch, updateCalf } from "../api/calves"
import { useAppContext } from "../context"
import { formatDateMMDDYYYY } from "../utils/dateFormat"
import { isDateInDateRange } from "../utils/dateRange"
import { getWeightBracketLabel, normalizeWeightBrackets } from "../utils/weightBrackets"
import MainDataTable from "../components/shared/mainDataTable"
import DateFilterMenu from "../components/shared/dateFilterMenu"
import BreedSellerFilterMenu from "../components/shared/breedSellerFilterMenu"
import SearchOptionsMenu from "../components/shared/searchOptionsMenu"
import { RanchPageSkeleton } from "../components/shared/loadingSkeletons"
import sexOptions from "../api/sex/sexOptions"

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null

    const directParsed = Number(trimmed)
    if (Number.isFinite(directParsed)) return directParsed

    const currencyParsed = Number(trimmed.replace(/[^0-9.-]/g, ""))
    return Number.isFinite(currencyParsed) ? currencyParsed : null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeText = (value) => String(value || "").trim()
const normalizeTextKey = (value) => normalizeText(value).toLowerCase()
const toTitleCase = (value) => normalizeText(value).toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())

const normalizeDateInput = (value) => {
  if (!value) return ""
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  return parsed.toISOString().slice(0, 10)
}

const todayDateInput = () => new Date().toISOString().slice(0, 10)

const normalizeBracketKey = (value, index = 0) => {
  const raw = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
  return raw || `wb_${index + 1}`
}

const normalizeBreedList = (value) => {
  if (!Array.isArray(value)) return []
  const unique = new Map()
  value.forEach((item) => {
    const nextValue = normalizeText(item)
    if (!nextValue) return
    const key = nextValue.toLowerCase()
    if (!unique.has(key)) unique.set(key, nextValue)
  })
  return Array.from(unique.values())
}

const normalizeWeightBracketColumns = (weightCategories) => {
  const source = Array.isArray(weightCategories) ? weightCategories : []
  const used = new Set()

  return source.map((item, index) => {
    const sourceKey = normalizeText(item?.key)
    const sourceLabel = normalizeText(item?.label) || `Bracket ${index + 1}`
    let normalizedKey = normalizeBracketKey(sourceKey || sourceLabel, index)
    while (used.has(normalizedKey)) {
      normalizedKey = `${normalizedKey}_${index + 1}`
    }
    used.add(normalizedKey)

    return {
      key: normalizedKey,
      rawKey: sourceKey,
      label: sourceLabel,
      labelKey: normalizeBracketKey(sourceLabel, index),
      min: toNullableNumber(item?.min),
      max: toNullableNumber(item?.max),
      breeds: normalizeBreedList(item?.breeds),
      index,
    }
  })
}

const normalizeWeightColumnsFromSheet = (sheetData) => {
  const source = sheetData && typeof sheetData === "object" && !Array.isArray(sheetData) ? sheetData : {}
  const sourceColumns = Array.isArray(source.columns)
    ? source.columns
    : (Array.isArray(source.weightColumns)
      ? source.weightColumns
      : (Array.isArray(source.weightBracketColumns) ? source.weightBracketColumns : []))

  if (sourceColumns.length === 0) return []

  const used = new Set()
  return sourceColumns.map((item, index) => {
    const sourceKey = normalizeText(item?.key)
    const sourceLabel = normalizeText(item?.label) || `Bracket ${index + 1}`
    let normalizedKey = normalizeBracketKey(sourceKey || sourceLabel, index)
    while (used.has(normalizedKey)) {
      normalizedKey = `${normalizedKey}_${index + 1}`
    }
    used.add(normalizedKey)

    return {
      key: normalizedKey,
      rawKey: sourceKey,
      label: sourceLabel,
      labelKey: normalizeBracketKey(sourceLabel, index),
      min: toNullableNumber(item?.min),
      max: toNullableNumber(item?.max),
      breeds: normalizeBreedList(item?.breeds),
      index,
    }
  })
}

const normalizeSheetData = (sheetData) => {
  const source = sheetData && typeof sheetData === "object" && !Array.isArray(sheetData) ? sheetData : {}
  return {
    columns: Array.isArray(source.columns) ? source.columns : [],
    weightColumns: Array.isArray(source.weightColumns) ? source.weightColumns : [],
    weightBracketColumns: Array.isArray(source.weightBracketColumns) ? source.weightBracketColumns : [],
    weightRows: Array.isArray(source.weightRows) ? source.weightRows : [],
    singleRows: Array.isArray(source.singleRows) ? source.singleRows : [],
  }
}

const normalizeSearchValue = (value) => String(value ?? "").toLowerCase().trim().replace(/[\s-]+/g, "")
const getCalfPurchasePrice = (calf) => toNullableNumber(calf?.purchasePrice ?? calf?.price)

const VALID_SEX = new Set((Array.isArray(sexOptions) ? sexOptions : []).map((item) => normalizeText(item?.value)))

const normalizeSexToken = (value) => {
  const raw = normalizeText(value)
  if (!raw) return ""
  if (VALID_SEX.has(raw)) return raw

  const collapsed = raw.toLowerCase().replace(/[^a-z]/g, "")
  if (collapsed === "bull") return "bull"
  if (collapsed === "heifer") return "heifer"
  if (collapsed === "steer") return "steer"
  if (collapsed === "freemartin") return "freeMartin"
  return ""
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

  return Array.from(unique)
}

const sexMatches = (rowSex, calfSex) => {
  const rowSexes = normalizeSexValues(rowSex)
  const calfSexToken = normalizeSexToken(calfSex)
  if (rowSexes.length === 0) return true
  if (!calfSexToken) return false
  return rowSexes.includes(calfSexToken)
}

const getCandidateRowsByBreedSex = (rows, calf) => {
  const sourceRows = Array.isArray(rows) ? rows : []
  const calfBreedKey = normalizeTextKey(calf?.breed)
  const wildcardBreedRows = sourceRows.filter((row) => !normalizeTextKey(row?.breed))
  const breedMatches = sourceRows.filter((row) => normalizeTextKey(row?.breed) === calfBreedKey)

  const matchingRows = breedMatches.length > 0 ? breedMatches : wildcardBreedRows
  if (matchingRows.length === 0) return []

  const sexMatchesRows = matchingRows.filter((row) => sexMatches(row?.sex, calf?.sex))
  return sexMatchesRows.length > 0 ? sexMatchesRows : matchingRows
}

const getWeightColumnPriority = (column, calfBreedKey) => {
  const allowedBreeds = normalizeBreedList(column?.breeds).map((item) => item.toLowerCase())
  const isBreedSpecific = allowedBreeds.length > 0 && calfBreedKey && allowedBreeds.includes(calfBreedKey)

  const min = toNullableNumber(column?.min)
  const max = toNullableNumber(column?.max)
  const span = min === null || max === null ? Number.POSITIVE_INFINITY : Math.max(0, max - min)

  return {
    isBreedSpecific,
    span,
    index: Number.isFinite(column?.index) ? column.index : Number.MAX_SAFE_INTEGER,
  }
}

const findMatchingWeightColumns = (columns, calf) => {
  const sourceColumns = Array.isArray(columns) ? columns : []
  const calfWeight = toNullableNumber(calf?.weight)
  const calfBreedKey = normalizeTextKey(calf?.breed)
  if (calfWeight === null) return []

  const matching = sourceColumns.filter((column) => {
    const minOk = column.min === null || calfWeight >= column.min
    const maxOk = column.max === null || calfWeight <= column.max
    if (!minOk || !maxOk) return false

    const allowedBreeds = normalizeBreedList(column?.breeds).map((item) => item.toLowerCase())
    return allowedBreeds.length === 0 || (calfBreedKey && allowedBreeds.includes(calfBreedKey))
  })

  return matching.sort((a, b) => {
    const aPriority = getWeightColumnPriority(a, calfBreedKey)
    const bPriority = getWeightColumnPriority(b, calfBreedKey)

    if (aPriority.isBreedSpecific !== bPriority.isBreedSpecific) {
      return aPriority.isBreedSpecific ? -1 : 1
    }
    if (aPriority.span !== bPriority.span) {
      return aPriority.span - bPriority.span
    }
    return aPriority.index - bPriority.index
  })
}

const getWeightRowPriceForColumn = (row, columnMatch) => {
  const prices = row?.prices && typeof row.prices === "object" && !Array.isArray(row.prices)
    ? row.prices
    : {}

  const directCandidates = Array.from(new Set([
    columnMatch?.key,
    columnMatch?.rawKey,
    columnMatch?.labelKey,
    columnMatch?.label,
  ].filter(Boolean)))

  for (const key of directCandidates) {
    const direct = toNullableNumber(prices[key])
    if (direct !== null) return direct
  }

  const normalizedMap = new Map()
  Object.entries(prices).forEach(([key, value]) => {
    const parsed = toNullableNumber(value)
    if (parsed === null) return
    const normalizedKey = normalizeBracketKey(key)
    if (normalizedKey && !normalizedMap.has(normalizedKey)) {
      normalizedMap.set(normalizedKey, parsed)
    }
  })

  for (const key of directCandidates) {
    const normalizedKey = normalizeBracketKey(key)
    if (!normalizedKey) continue
    if (normalizedMap.has(normalizedKey)) return normalizedMap.get(normalizedKey)
  }

  return null
}

const getSingleRowPrice = (row) => {
  const direct = toNullableNumber(row?.price)
  if (direct !== null) return direct

  const prices = row?.prices && typeof row.prices === "object" && !Array.isArray(row.prices)
    ? row.prices
    : null
  if (!prices) return null

  for (const value of Object.values(prices)) {
    const parsed = toNullableNumber(value)
    if (parsed !== null) return parsed
  }

  return null
}

const getActivePricePeriod = (pricePeriods) => {
  const source = Array.isArray(pricePeriods) ? pricePeriods : []
  if (source.length === 0) return null
  const today = todayDateInput()

  const normalized = source
    .map((period, index) => ({
      ...period,
      _index: index,
      startDate: normalizeDateInput(period?.startDate),
      endDate: normalizeDateInput(period?.endDate),
      layoutMode: String(period?.layoutMode || "").toLowerCase() === "weight" ? "weight" : "single",
      sheetData: normalizeSheetData(period?.sheetData),
    }))
    .sort((a, b) => {
      const aDate = a.startDate || "0000-00-00"
      const bDate = b.startDate || "0000-00-00"
      if (aDate < bDate) return -1
      if (aDate > bDate) return 1
      return a._index - b._index
    })

  const active = normalized.filter((period) => {
    const startsOk = !period.startDate || period.startDate <= today
    const endsOk = !period.endDate || today <= period.endDate
    return startsOk && endsOk
  })
  if (active.length > 0) return active[active.length - 1]

  const previous = normalized.filter((period) => period.startDate && period.startDate <= today)
  if (previous.length > 0) return previous[previous.length - 1]

  return normalized[0] || null
}

const getSuggestedPriceForCalf = ({ calf, activePeriod, weightColumns }) => {
  const currentPrice = getCalfPurchasePrice(calf)
  if (currentPrice !== null) {
    return {
      status: "already_set",
      suggestedPrice: currentPrice,
      reason: "Already Has Purchase Price",
      layoutMode: activePeriod?.layoutMode || "single",
      bracketLabel: getWeightBracketLabel(calf?.weight, weightColumns, calf?.breed),
    }
  }

  if (!activePeriod) {
    return {
      status: "missing",
      suggestedPrice: null,
      reason: "No Active Price Period",
      layoutMode: "single",
      bracketLabel: "-",
    }
  }

  const layoutMode = activePeriod.layoutMode === "weight" ? "weight" : "single"
  const sheetData = normalizeSheetData(activePeriod.sheetData)

  if (layoutMode === "weight") {
    if (!Array.isArray(sheetData.weightRows) || sheetData.weightRows.length === 0) {
      return { status: "missing", suggestedPrice: null, reason: "Current Period Has No Weight Rows", layoutMode, bracketLabel: "-" }
    }

    const rowMatches = getCandidateRowsByBreedSex(sheetData.weightRows, calf)
    if (rowMatches.length === 0) {
      return { status: "missing", suggestedPrice: null, reason: "No Breed/Sex Match In Weight Rows", layoutMode, bracketLabel: "-" }
    }

    const columnMatches = findMatchingWeightColumns(weightColumns, calf)
    if (columnMatches.length === 0) {
      return { status: "missing", suggestedPrice: null, reason: "No Weight Bracket Match", layoutMode, bracketLabel: "-" }
    }

    let matchedColumn = null
    let suggestedPrice = null

    for (const columnMatch of columnMatches) {
      for (const row of rowMatches) {
        const nextPrice = getWeightRowPriceForColumn(row, columnMatch)
        if (nextPrice !== null) {
          suggestedPrice = nextPrice
          matchedColumn = columnMatch
          break
        }
      }
      if (suggestedPrice !== null) break
    }

    if (suggestedPrice === null) {
      return {
        status: "missing",
        suggestedPrice: null,
        reason: "No Price For Matched Bracket",
        layoutMode,
        bracketLabel: columnMatches[0]?.label || "-",
      }
    }

    return {
      status: "ready",
      suggestedPrice,
      reason: "Matched Weight Row",
      layoutMode,
      bracketLabel: matchedColumn?.label || columnMatches[0]?.label || "-",
    }
  }

  if (!Array.isArray(sheetData.singleRows) || sheetData.singleRows.length === 0) {
    return { status: "missing", suggestedPrice: null, reason: "Current Period Has No Single Rows", layoutMode, bracketLabel: "-" }
  }

  const rowMatches = getCandidateRowsByBreedSex(sheetData.singleRows, calf)
  if (rowMatches.length === 0) {
    return { status: "missing", suggestedPrice: null, reason: "No Breed/Sex Match In Single Rows", layoutMode, bracketLabel: "-" }
  }

  const rowWithPrice = rowMatches.find((row) => getSingleRowPrice(row) !== null)
  const suggestedPrice = getSingleRowPrice(rowWithPrice)
  if (suggestedPrice === null) {
    return { status: "missing", suggestedPrice: null, reason: "No Single Price Set", layoutMode, bracketLabel: "-" }
  }

  return {
    status: "ready",
    suggestedPrice,
    reason: "Matched Single Row",
    layoutMode,
    bracketLabel: getWeightBracketLabel(calf?.weight, weightColumns, calf?.breed),
  }
}

const applyCalfFilters = (source, filters) => {
  const asArray = (value) => {
    if (Array.isArray(value)) return value
    if (value === null || value === undefined || value === "") return []
    return [value]
  }

  return source.filter((calf) => {
    const searchMode = filters.searchMode || "single"
    const searchMatchMode = filters.searchMatch || "contains"
    const searchValue = normalizeSearchValue(filters.search)
    const searchTokens = String(filters.search || "")
      .split(/[,\n]+/)
      .map((value) => normalizeSearchValue(value))
      .filter(Boolean)

    const searchableValuesByField = {
      visualTag: [calf.primaryID, calf.visualTag],
      eid: [calf.EID, calf.eid],
      backTag: [calf.backTag, calf.originalID],
    }
    const searchField = filters.searchField || "all"
    const searchableValues = (
      searchField === "all"
        ? [...searchableValuesByField.visualTag, ...searchableValuesByField.eid, ...searchableValuesByField.backTag]
        : (searchableValuesByField[searchField] || [])
    )
      .map((value) => normalizeSearchValue(value))
      .filter(Boolean)

    const matchesSearchValue = (candidateValue) => (
      searchMatchMode === "exact"
        ? searchableValues.some((value) => value === candidateValue)
        : searchableValues.some((value) => value.includes(candidateValue))
    )

    const searchMatch = !searchValue
      ? true
      : searchMode === "multiple"
        ? searchTokens.length === 0 || searchTokens.some((token) => matchesSearchValue(token))
        : matchesSearchValue(searchValue)

    const breedFilterValues = asArray(filters.breed)
    const sellerFilterValues = asArray(filters.seller)
    const weightBracketFilter = String(filters.weightBracket || "")

    const breedMatch = breedFilterValues.length === 0 || breedFilterValues.includes(calf.breed)
    const sellerMatch = sellerFilterValues.length === 0 || sellerFilterValues.includes(calf.seller)
    const weightBracket = getWeightBracketLabel(calf.weight, filters.weightBrackets, calf.breed)
    const weightBracketMatch = !weightBracketFilter || weightBracket === weightBracketFilter

    const rawDate = calf.dateIn || calf.placedDate
    const dateRangeMatch = isDateInDateRange(rawDate, filters.dateFrom, filters.dateTo)

    return searchMatch && breedMatch && sellerMatch && weightBracketMatch && dateRangeMatch
  })
}

const formatMoneyCell = (value) => {
  if (value === null || value === undefined || value === "") return "-"
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return "-"
  return `$${parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const SetPrices = () => {
  const { id } = useParams()
  const token = useToken()
  const { ranch, setRanch, confirmAction, showSuccess, showError } = useAppContext()
  const showErrorRef = useRef(showError)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [calves, setCalves] = useState([])
  const [applyingAll, setApplyingAll] = useState(false)
  const [applyingId, setApplyingId] = useState(null)

  const [mainSearch, setMainSearch] = useState("")
  const [mainSearchMode, setMainSearchMode] = useState("single")
  const [mainSearchMatch, setMainSearchMatch] = useState("contains")
  const [mainSearchField, setMainSearchField] = useState("all")
  const [mainBreed, setMainBreed] = useState([])
  const [mainSeller, setMainSeller] = useState([])
  const [mainWeightBracket, setMainWeightBracket] = useState("")
  const [mainDateFrom, setMainDateFrom] = useState("")
  const [mainDateTo, setMainDateTo] = useState("")
  const [mainRowLimit, setMainRowLimit] = useState(15)

  useEffect(() => {
    showErrorRef.current = showError
  }, [showError])

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!token || !id) return
    if (silent) setRefreshing(true)
    else setLoading(true)

    try {
      const [ranchData, inventoryData] = await Promise.all([
        getRanchById(id, token),
        getInventoryByRanch(id, token),
      ])
      setRanch(ranchData || null)
      setCalves(Array.isArray(inventoryData) ? inventoryData : [])
    } catch (error) {
      console.error("Error loading set-prices data:", error)
      showErrorRef.current?.(error?.response?.data?.message || "Could not load ranch pricing data.")
    } finally {
      if (silent) setRefreshing(false)
      else setLoading(false)
    }
  }, [id, setRanch, token])

  useEffect(() => {
    loadData()
  }, [loadData])

  const effectiveWeightBrackets = useMemo(
    () => normalizeWeightBrackets(ranch?.weightCategories),
    [ranch?.weightCategories]
  )
  const activePricePeriod = useMemo(
    () => getActivePricePeriod(ranch?.pricePeriods),
    [ranch?.pricePeriods]
  )
  const weightColumns = useMemo(() => {
    const fromRanch = normalizeWeightBracketColumns(ranch?.weightCategories)
    if (fromRanch.length > 0) return fromRanch

    const sheetData = activePricePeriod?.sheetData
    const fromSheet = normalizeWeightColumnsFromSheet(sheetData)
    return fromSheet
  }, [activePricePeriod?.sheetData, ranch?.weightCategories])
  const bracketSourceForFilters = useMemo(
    () => (effectiveWeightBrackets.length > 0 ? effectiveWeightBrackets : weightColumns),
    [effectiveWeightBrackets, weightColumns]
  )

  const breedOptions = useMemo(
    () => [...new Set(calves.map((calf) => calf.breed).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))),
    [calves]
  )
  const sellerOptions = useMemo(
    () => [...new Set(calves.map((calf) => calf.seller).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))),
    [calves]
  )
  const weightBracketOptions = useMemo(
    () => bracketSourceForFilters.map((category) => category.label).filter(Boolean),
    [bracketSourceForFilters]
  )

  const filteredCalves = useMemo(
    () => applyCalfFilters(calves, {
      search: mainSearch,
      searchMode: mainSearchMode,
      searchMatch: mainSearchMatch,
      searchField: mainSearchField,
      breed: mainBreed,
      seller: mainSeller,
      weightBracket: mainWeightBracket,
      weightBrackets: bracketSourceForFilters,
      dateFrom: mainDateFrom,
      dateTo: mainDateTo,
    }),
    [
      calves,
      bracketSourceForFilters,
      mainBreed,
      mainDateFrom,
      mainDateTo,
      mainSearch,
      mainSearchField,
      mainSearchMatch,
      mainSearchMode,
      mainSeller,
      mainWeightBracket,
    ]
  )

  const unpricedCalves = useMemo(
    () => filteredCalves.filter((calf) => getCalfPurchasePrice(calf) === null),
    [filteredCalves]
  )

  const rowsWithSuggestions = useMemo(
    () => unpricedCalves.map((calf) => ({
      calf,
      suggestion: getSuggestedPriceForCalf({
        calf,
        activePeriod: activePricePeriod,
        weightColumns,
      }),
    })),
    [activePricePeriod, unpricedCalves, weightColumns]
  )

  const readyRows = useMemo(
    () => rowsWithSuggestions.filter((entry) => entry.suggestion.status === "ready" && entry.suggestion.suggestedPrice !== null),
    [rowsWithSuggestions]
  )

  const missingRows = useMemo(
    () => rowsWithSuggestions.filter((entry) => entry.suggestion.status === "missing"),
    [rowsWithSuggestions]
  )

  const tableColumns = [
    { key: "visualTag", label: "Visual Tag" },
    { key: "eid", label: "EID" },
    { key: "backTag", label: "Back Tag" },
    { key: "dateIn", label: "Date In" },
    { key: "breed", label: "Breed" },
    { key: "sex", label: "Sex" },
    { key: "weight", label: "Weight", align: "right" },
    { key: "weightBracket", label: "Bracket" },
    { key: "layoutMode", label: "Layout" },
    { key: "pricingStatus", label: "Pricing Status" },
    { key: "suggestedPrice", label: "Suggested Price", align: "right" },
    { key: "apply", label: "Action", align: "right", sortable: false },
  ]

  const tableRows = useMemo(
    () => rowsWithSuggestions.map(({ calf, suggestion }) => ({
      id: calf.id,
      visualTag: calf.primaryID || calf.visualTag || "-",
      eid: calf.EID || calf.eid || "-",
      backTag: calf.backTag || calf.originalID || "-",
      dateIn: formatDateMMDDYYYY(calf.dateIn || calf.placedDate, "-"),
      breed: calf.breed ? toTitleCase(calf.breed) : "-",
      sex: calf.sex ? toTitleCase(calf.sex) : "-",
      weight: toNullableNumber(calf.weight),
      weightBracket: getWeightBracketLabel(calf.weight, bracketSourceForFilters, calf.breed),
      layoutMode: suggestion.layoutMode === "weight" ? "By Weight" : "Single Price",
      pricingStatus: suggestion,
      suggestedPrice: suggestion.suggestedPrice,
      apply: suggestion.status === "ready" ? "Apply" : "-",
    })),
    [bracketSourceForFilters, rowsWithSuggestions]
  )

  const getMainSearchPlaceholder = useCallback((mode, field) => {
    const byField = {
      visualTag: mode === "multiple" ? "TAG-001, TAG-002, TAG-003" : "Search visual tag",
      eid: mode === "multiple" ? "982000001, 982000002, 982000003" : "Search EID",
      backTag: mode === "multiple" ? "B-001, B-002, B-003" : "Search back tag",
      all: mode === "multiple" ? "TAG-001, TAG-002, TAG-003" : "Search tag / EID / back tag",
    }
    return byField[field] || byField.all
  }, [])

  const applyPriceToRow = async (rowId, suggestedPrice) => {
    if (!token || !rowId) return
    if (toNullableNumber(suggestedPrice) === null) return
    setApplyingId(rowId)
    try {
      const updated = await updateCalf(rowId, { purchasePrice: Number(suggestedPrice) }, token)
      setCalves((prev) => prev.map((calf) => (calf.id === rowId ? { ...calf, ...updated } : calf)))
      showSuccess(`Purchase price assigned to calf ${rowId}.`, "Price Set")
    } catch (error) {
      console.error("Error setting calf purchase price:", error)
      showError(error?.response?.data?.message || "Could not assign purchase price to calf.")
    } finally {
      setApplyingId(null)
    }
  }

  const applyAllSuggestedPrices = async () => {
    if (!token || readyRows.length === 0 || applyingAll) return

    const confirmed = await confirmAction({
      title: "Apply Suggested Prices",
      message: `Apply ${readyRows.length} suggested purchase prices to calves without price?`,
      confirmText: "YES",
      cancelText: "NO",
    })
    if (!confirmed) return

    setApplyingAll(true)
    let successCount = 0
    let failedCount = 0
    const updatesById = new Map()

    try {
      for (const entry of readyRows) {
        const calfId = entry.calf?.id
        const suggestedPrice = entry.suggestion?.suggestedPrice
        if (!calfId || toNullableNumber(suggestedPrice) === null) continue

        try {
          const updated = await updateCalf(calfId, { purchasePrice: Number(suggestedPrice) }, token)
          updatesById.set(calfId, updated)
          successCount += 1
        } catch (error) {
          console.error("Error assigning suggested price:", error)
          failedCount += 1
        }
      }

      if (updatesById.size > 0) {
        setCalves((prev) => prev.map((calf) => (updatesById.has(calf.id) ? { ...calf, ...updatesById.get(calf.id) } : calf)))
      }

      if (successCount > 0) {
        showSuccess(`Assigned ${successCount} purchase prices.`, "Pricing Complete")
      }
      if (failedCount > 0) {
        showError(`Failed to assign ${failedCount} calves.`)
      }
    } finally {
      setApplyingAll(false)
    }
  }

  if (!ranch || loading) return <RanchPageSkeleton />

  const activePeriodLabel = activePricePeriod?.label || "No Active Period"
  const activePeriodRange = activePricePeriod
    ? `${activePricePeriod.startDate || "No Start"}${activePricePeriod.endDate ? ` to ${activePricePeriod.endDate}` : " to Open End"}`
    : "Configure a price period in Prices first."
  const activeLayoutLabel = activePricePeriod?.layoutMode === "weight" ? "By Weight" : "Single Price"

  return (
    <div className="w-full flex flex-col gap-6 px-4 md:px-6 py-6">
      <div className="rounded-2xl border border-primary-border/45 dark:border-primary-border/65 bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-secondary">Calves</p>
            <h2 className="mt-1 text-xl font-semibold text-primary-text">Set Prices</h2>
            <p className="mt-1 text-sm text-secondary">
              Assign purchase prices to calves without price using the current ranch price period.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-[320px]">
            <div className="rounded-xl border border-action-blue/40 bg-action-blue/10 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-action-blue/90">Unpriced In View</p>
              <p className="text-lg font-semibold text-action-blue">{rowsWithSuggestions.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-400/45 bg-emerald-500/10 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Ready To Apply</p>
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">{readyRows.length}</p>
            </div>
            <div className="rounded-xl border border-amber-400/45 bg-amber-500/10 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-amber-700 dark:text-amber-300">Need Review</p>
              <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">{missingRows.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-primary-border/45 dark:border-primary-border/65 bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Active Price Period</p>
            <p className="mt-1 text-base font-semibold text-primary-text">{activePeriodLabel}</p>
            <p className="mt-0.5 text-xs text-secondary">{activePeriodRange}</p>
            <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-primary-border/45 bg-primary-border/10 px-2 py-0.5 text-xs font-medium text-primary-text">
              <Sparkles className="size-3.5 text-action-blue" />
              Layout: {activeLayoutLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary-border/55 px-3 py-2 text-xs font-medium text-primary-text hover:bg-primary-border/10 disabled:opacity-60"
              onClick={() => loadData({ silent: true })}
              disabled={refreshing || applyingAll}
            >
              <RefreshCcw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-action-blue/80 bg-action-blue px-3 py-2 text-xs font-semibold text-white hover:bg-action-blue/90 disabled:opacity-60"
              onClick={applyAllSuggestedPrices}
              disabled={applyingAll || readyRows.length === 0 || !activePricePeriod}
            >
              <CheckCircle2 className="size-3.5" />
              {applyingAll ? "Applying..." : `Apply ${readyRows.length} Suggested`}
            </button>
          </div>
        </div>
      </div>

      {!activePricePeriod && (
        <div className="rounded-2xl border border-amber-400/45 bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-200">
          <p className="inline-flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="size-4" />
            No active price period found for this ranch. Set current prices in the global Prices view.
          </p>
        </div>
      )}

      <MainDataTable
        title="Unpriced Calves"
        rows={tableRows}
        columns={tableColumns}
        emptyMessage="All calves already have a purchase price."
        enablePagination
        pageSize={mainRowLimit}
        defaultSortKey="visualTag"
        defaultSortDirection="asc"
        tableClassName="min-w-[1220px]"
        headerCellClassName="!text-secondary dark:!text-secondary"
        bodyCellClassName="!text-primary-text dark:!text-primary-text"
        cellRenderers={{
          weight: (row) => row.weight === null ? "-" : Number(row.weight).toLocaleString(),
          pricingStatus: (row) => {
            const status = row.pricingStatus?.status
            const reason = row.pricingStatus?.reason || ""

            if (status === "ready") {
              return (
                <span className="inline-flex items-center rounded-full border border-emerald-400/45 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Ready
                </span>
              )
            }

            if (status === "already_set") {
              return (
                <span className="inline-flex items-center rounded-full border border-action-blue/45 bg-action-blue/10 px-2 py-0.5 text-xs font-semibold text-action-blue">
                  Already Set
                </span>
              )
            }

            return (
              <span className="inline-flex items-center rounded-full border border-amber-400/45 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                {reason || "Missing"}
              </span>
            )
          },
          suggestedPrice: (row) => formatMoneyCell(row.suggestedPrice),
          apply: (row) => {
            const suggestion = row.pricingStatus || {}
            const canApply = suggestion.status === "ready" && toNullableNumber(suggestion.suggestedPrice) !== null
            if (!canApply) return <span className="text-xs text-secondary">-</span>

            return (
              <button
                type="button"
                className="rounded-lg border border-action-blue/70 bg-action-blue/10 px-2 py-1 text-xs font-semibold text-action-blue hover:bg-action-blue/20 disabled:opacity-50"
                onClick={(event) => {
                  event.stopPropagation()
                  applyPriceToRow(row.id, suggestion.suggestedPrice)
                }}
                disabled={Boolean(applyingId) || applyingAll}
              >
                {applyingId === row.id ? "Applying..." : "Set Price"}
              </button>
            )
          },
        }}
        filters={(
          <div className="flex flex-col xl:flex-wrap xl:flex-row xl:items-start xl:justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-3 xl:flex-1 xl:min-w-[380px]">
              <SearchOptionsMenu
                searchMode={mainSearchMode}
                searchMatch={mainSearchMatch}
                searchField={mainSearchField}
                fieldOptions={[
                  { value: "all", label: "All" },
                  { value: "visualTag", label: "Visual Tag" },
                  { value: "eid", label: "EID" },
                  { value: "backTag", label: "Back Tag" },
                ]}
                onChange={({ searchMode, searchMatch, searchField }) => {
                  setMainSearchMode(searchMode)
                  setMainSearchMatch(searchMatch)
                  setMainSearchField(searchField || "all")
                }}
              />
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-secondary" />
                <input
                  className="h-[40px] w-full rounded-xl border border-primary-border/45 bg-surface pl-9 pr-9 text-xs text-primary-text"
                  placeholder={getMainSearchPlaceholder(mainSearchMode, mainSearchField)}
                  value={mainSearch}
                  onChange={(event) => setMainSearch(event.target.value)}
                />
                {mainSearch && (
                  <button
                    type="button"
                    onClick={() => setMainSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-secondary hover:bg-primary-border/10"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 xl:flex-1 xl:min-w-[520px]">
              <BreedSellerFilterMenu
                className="w-full"
                breed={mainBreed}
                seller={mainSeller}
                weightBracket={mainWeightBracket}
                breedOptions={breedOptions}
                sellerOptions={sellerOptions}
                weightBracketOptions={weightBracketOptions}
                showWeightBracket
                onChange={({ breed, seller, weightBracket }) => {
                  setMainBreed(Array.isArray(breed) ? breed : (breed ? [breed] : []))
                  setMainSeller(Array.isArray(seller) ? seller : (seller ? [seller] : []))
                  setMainWeightBracket(weightBracket || "")
                }}
              />
              <DateFilterMenu
                className="w-full"
                dateFrom={mainDateFrom}
                dateTo={mainDateTo}
                onChange={({ from, to }) => {
                  setMainDateFrom(from)
                  setMainDateTo(to)
                }}
              />
              <input
                type="number"
                max={1000}
                className="w-full rounded-xl border border-primary-border/45 bg-surface px-3 py-2 text-xs text-primary-text"
                value={mainRowLimit}
                onChange={(event) => {
                  const rawValue = event.target.value
                  if (rawValue === "") {
                    setMainRowLimit("")
                    return
                  }
                  const nextValue = Number(rawValue)
                  if (!Number.isFinite(nextValue)) return
                  setMainRowLimit(Math.max(0, Math.min(1000, nextValue)))
                }}
              />
              <button
                type="button"
                className="w-full rounded-xl border border-primary-border/45 px-3 py-1.5 text-xs font-medium text-primary-text hover:bg-primary-border/10"
                onClick={() => {
                  setMainSearch("")
                  setMainSearchMode("single")
                  setMainSearchMatch("contains")
                  setMainSearchField("all")
                  setMainBreed([])
                  setMainSeller([])
                  setMainWeightBracket("")
                  setMainDateFrom("")
                  setMainDateTo("")
                }}
              >
                Reset
              </button>
            </div>
          </div>
        )}
      />
    </div>
  )
}

export default SetPrices
