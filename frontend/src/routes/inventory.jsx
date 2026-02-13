import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Download, Search, X } from "lucide-react"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import { useToken } from "../api/useToken"
import { getRanchById } from "../api/ranches"
import { getInventoryByRanch, getManageCalvesByRanch, getCalfMovementHistory, updateCalf, deleteCalf, createCalf } from "../api/calves"
import { useAppContext } from "../context"
import { formatDateMMDDYYYY } from "../utils/dateFormat"
import { isDateInDateRange } from "../utils/dateRange"
import MainDataTable from "../components/shared/mainDataTable"
import DateFilterMenu from "../components/shared/dateFilterMenu"
import BreedSellerFilterMenu from "../components/shared/breedSellerFilterMenu"
import SearchOptionsMenu from "../components/shared/searchOptionsMenu"
import CalfDetailPanel from "../components/calves/calfDetailPanel"
import CalfEditModal from "../components/calves/calfEditModal"
import { RanchPageSkeleton } from "../components/shared/loadingSkeletons"
import { getWeightCategoryLabel, normalizeWeightCategories } from "../utils/weightCategories"

const Inventory = () => {

    const { id } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const token = useToken()
    const { ranch, setRanch, confirmAction, showSuccess, showError } = useAppContext()
    const [calves, setCalves] = useState([])
    const [loadingInventory, setLoadingInventory] = useState(true)
    const [selectedCalf, setSelectedCalf] = useState(null)
    const [selectedCalfDetails, setSelectedCalfDetails] = useState(null)
    const [movementHistory, setMovementHistory] = useState(null)
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const isManageMode = location.pathname.endsWith("/manage-calves")

    useEffect(() => {
      if (!id) return
      if (location.pathname.endsWith("/inventory") && searchParams.get("mode") === "manage") {
        navigate(`/dashboard/ranch/${id}/manage-calves`, { replace: true })
      }
    }, [id, location.pathname, navigate, searchParams])
    const [selectedIds, setSelectedIds] = useState([])
    const [manageSearchMode, setManageSearchMode] = useState("single")
    const [tagSearch, setTagSearch] = useState("")
    const [bulkTagSearch, setBulkTagSearch] = useState("")
    const [manageBreed, setManageBreed] = useState([])
    const [manageSeller, setManageSeller] = useState([])
    const [manageStatus, setManageStatus] = useState("")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")
    const [manageRowLimit, setManageRowLimit] = useState(15)
    const [managePage, setManagePage] = useState(1)
    const [bulkField, setBulkField] = useState("purchasePrice")
    const [bulkValue, setBulkValue] = useState("")
    const [bulkLoading, setBulkLoading] = useState(false)
    const [lastBulkChange, setLastBulkChange] = useState(null)
    const [lastDeletedCalves, setLastDeletedCalves] = useState([])
    const [manageMessage, setManageMessage] = useState("")
    const [mainSearch, setMainSearch] = useState("")
    const [mainSearchMode, setMainSearchMode] = useState("single")
    const [mainSearchMatch, setMainSearchMatch] = useState("contains")
    const [mainSearchField, setMainSearchField] = useState("all")
    const [mainBreed, setMainBreed] = useState([])
    const [mainSeller, setMainSeller] = useState([])
    const [mainWeightCategory, setMainWeightCategory] = useState("")
    const [mainDateFrom, setMainDateFrom] = useState("")
    const [mainDateTo, setMainDateTo] = useState("")
    const [mainRowLimit, setMainRowLimit] = useState(15)

    const [breedFilterSeller, setBreedFilterSeller] = useState([])
    const [breedDateFrom, setBreedDateFrom] = useState("")
    const [breedDateTo, setBreedDateTo] = useState("")

    const [sellerFilterBreed, setSellerFilterBreed] = useState([])
    const [sellerDateFrom, setSellerDateFrom] = useState("")
    const [sellerDateTo, setSellerDateTo] = useState("")
    const [manageSort, setManageSort] = useState({ key: "", direction: "asc" })
    const [breedSummarySort, setBreedSummarySort] = useState({ key: "totalCalves", direction: "desc" })
    const [sellerSummarySort, setSellerSummarySort] = useState({ key: "totalCalves", direction: "desc" })

    const manageButtonBaseClass = "h-[36px] rounded-xl border px-2 py-1.5 text-xs font-medium transition-colors"
    const manageButtonSecondaryClass = `${manageButtonBaseClass} border-primary-border/40 text-primary-text hover:bg-primary-border/10`
    const manageButtonPrimaryClass = `${manageButtonBaseClass} border-action-blue/80 bg-action-blue text-white hover:bg-action-blue/90 disabled:opacity-60`
    const hasUndoAction = (lastBulkChange?.rows?.length > 0) || lastDeletedCalves.length > 0
    const bulkStatusOptions = [
      { value: "feeding", label: "Feeding" },
      { value: "alive", label: "Alive" },
      { value: "shipped", label: "Shipped" },
      { value: "sold", label: "Sold" },
      { value: "dead", label: "Dead" },
    ]

    useEffect(() => {
      if (!ranch && token && id) {
        const fetchRanch = async () => {
          try {
            const data = await getRanchById(id, token)
            setRanch(data)
          } catch (err) {
            console.error("Error loading ranch:", err)
          }
        }
        fetchRanch()
    }
    }, [ranch, id, token, setRanch])

    useEffect(() => {
      if (!token || !id) return

      const fetchInventory = async () => {
        try {
          const data = isManageMode
            ? await getManageCalvesByRanch(id, token)
            : await getInventoryByRanch(id, token)
          setCalves(Array.isArray(data) ? data : [])
        } catch (err) {
          console.error("Error loading inventory:", err)
        } finally {
          setLoadingInventory(false)
        }
      }

      fetchInventory()
    }, [id, token, isManageMode])

    const tableColumns = [
      { key: "visualTag", label: "Visual Tag" },
      { key: "eid", label: "EID" },
      { key: "backTag", label: "Back Tag" },
      { key: "dateIn", label: "Date In" },
      { key: "breed", label: "Breed" },
      { key: "sex", label: "Sex" },
      { key: "purchasePrice", label: "Purchase Price" },
      { key: "daysOnFeed", label: "Days On Feed", align: "right" },
      { key: "weight", label: "Weight" },
      { key: "weightCategory", label: "Bracket" }
    ]

    const formatDateCell = (value) => {
      return formatDateMMDDYYYY(value, "-")
    }

    const formatMoneyCell = (value) => {
      if (value === null || value === undefined || value === "") return "-"
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) return "-"
      return `$${parsed.toLocaleString()}`
    }

    const formatDateForExport = (value) => {
      return formatDateMMDDYYYY(value, "")
    }

    const calculateDaysOnFeed = (calf) => {
      const intakeRaw = calf.dateIn || calf.placedDate
      const intakeDate = intakeRaw ? new Date(intakeRaw) : null
      const preDaysRaw = Number(calf.preDaysOnFeed)
      const preDays = Number.isFinite(preDaysRaw) ? preDaysRaw : 0

      if (!intakeDate || Number.isNaN(intakeDate.getTime())) {
        return preDays > 0 ? preDays : "-"
      }

      const today = new Date()
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const intakeStart = new Date(intakeDate.getFullYear(), intakeDate.getMonth(), intakeDate.getDate())
      const msDiff = todayStart.getTime() - intakeStart.getTime()
      const intakeDays = Math.floor(msDiff / (1000 * 60 * 60 * 24)) + 1
      const safeIntakeDays = Math.max(intakeDays, 1)

      return safeIntakeDays + preDays
    }

    const breedOptions = useMemo(
      () => [...new Set(calves.map((calf) => calf.breed).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))),
      [calves]
    )

    const sellerOptions = useMemo(
      () => [...new Set(calves.map((calf) => calf.seller).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))),
      [calves]
    )
    const effectiveWeightCategories = useMemo(
      () => normalizeWeightCategories(ranch?.weightCategories),
      [ranch?.weightCategories]
    )
    const weightCategoryOptions = useMemo(
      () => effectiveWeightCategories.map((category) => category.label).filter(Boolean),
      [effectiveWeightCategories]
    )

    const normalizeSearchValue = useCallback(
      (value) => String(value ?? "").toLowerCase().trim().replace(/[\s-]+/g, ""),
      []
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

    const applyCalfFilters = useCallback((source, filters) => {
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
        const weightCategoryFilter = String(filters.weightCategory || "")
        const breedMatch = breedFilterValues.length === 0 || breedFilterValues.includes(calf.breed)
        const sellerMatch = sellerFilterValues.length === 0 || sellerFilterValues.includes(calf.seller)
        const weightCategory = getWeightCategoryLabel(calf.weight, filters.weightCategories)
        const weightCategoryMatch = !weightCategoryFilter || weightCategory === weightCategoryFilter

        const rawDate = calf.dateIn || calf.placedDate
        const dateRangeMatch = isDateInDateRange(rawDate, filters.dateFrom, filters.dateTo)

        return searchMatch && breedMatch && sellerMatch && weightCategoryMatch && dateRangeMatch
      })
    }, [normalizeSearchValue])

    const sortRowsBy = (sourceRows, sortConfig, accessorMap = {}) => {
      if (!sortConfig?.key) return sourceRows

      const normalize = (value) => {
        if (value === null || value === undefined || value === "") return ""
        if (typeof value === "number") return value
        if (typeof value === "boolean") return value ? 1 : 0
        if (typeof value === "string") {
          const parsedNumber = Number(value.replace(/[^0-9.-]/g, ""))
          if (Number.isFinite(parsedNumber) && /[0-9]/.test(value)) return parsedNumber
          const parsedDate = Date.parse(value)
          if (!Number.isNaN(parsedDate) && /[-/]/.test(value)) return parsedDate
          return value.toLowerCase()
        }
        return String(value).toLowerCase()
      }

      const directionFactor = sortConfig.direction === "asc" ? 1 : -1
      const accessor = accessorMap[sortConfig.key] || ((row) => row?.[sortConfig.key])

      return [...sourceRows].sort((a, b) => {
        const aValue = normalize(accessor(a))
        const bValue = normalize(accessor(b))
        if (aValue < bValue) return -1 * directionFactor
        if (aValue > bValue) return 1 * directionFactor
        return 0
      })
    }

    const toggleSort = (setter, key) => {
      setter((prev) => (
        prev.key === key
          ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
          : { key, direction: "asc" }
      ))
    }

    const filteredMainCalves = useMemo(
      () => applyCalfFilters(calves, {
        search: mainSearch,
        searchMode: mainSearchMode,
        searchMatch: mainSearchMatch,
        searchField: mainSearchField,
        breed: mainBreed,
        seller: mainSeller,
        weightCategory: mainWeightCategory,
        weightCategories: effectiveWeightCategories,
        dateFrom: mainDateFrom,
        dateTo: mainDateTo,
      }),
      [applyCalfFilters, calves, mainSearch, mainSearchMode, mainSearchMatch, mainSearchField, mainBreed, mainSeller, mainWeightCategory, effectiveWeightCategories, mainDateFrom, mainDateTo]
    )
    const filteredBreedCalves = useMemo(
      () => applyCalfFilters(calves, { search: "", breed: breedFilterSeller, seller: [], dateFrom: breedDateFrom, dateTo: breedDateTo }),
      [applyCalfFilters, calves, breedFilterSeller, breedDateFrom, breedDateTo]
    )

    const filteredSellerCalves = useMemo(
      () => applyCalfFilters(calves, { search: "", breed: [], seller: sellerFilterBreed, dateFrom: sellerDateFrom, dateTo: sellerDateTo }),
      [applyCalfFilters, calves, sellerFilterBreed, sellerDateFrom, sellerDateTo]
    )

    const tableRows = useMemo(() => (
      filteredMainCalves.map((calf) => ({
        id: calf.id,
        visualTag: calf.primaryID || calf.visualTag || "-",
        eid: calf.EID || calf.eid || "-",
        backTag: calf.backTag || calf.originalID || "-",
        dateIn: formatDateCell(calf.dateIn || calf.placedDate),
        daysOnFeed: calculateDaysOnFeed(calf),
        weightCategory: getWeightCategoryLabel(calf.weight, effectiveWeightCategories),
        weight: calf.weight ?? "-",
        breed: calf.breed
          ? calf.breed.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
          : "-",
        sex: calf.sex
          ? calf.sex.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
          : "-",
        purchasePrice: formatMoneyCell(calf.purchasePrice ?? calf.price)
      }))
    ), [filteredMainCalves, effectiveWeightCategories])

    const breedSummaryRows = useMemo(() => {
      const accumulator = new Map()
      filteredBreedCalves.forEach((calf) => {
        const key = (calf.breed || "Unknown").toString().trim() || "Unknown"
        const normalized = key.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
        accumulator.set(normalized, (accumulator.get(normalized) || 0) + 1)
      })
      return [...accumulator.entries()]
        .map(([breed, totalCalves]) => ({ breed, totalCalves }))
        .sort((a, b) => b.totalCalves - a.totalCalves)
    }, [filteredBreedCalves])

    const sellerSummaryRows = useMemo(() => {
      const accumulator = new Map()
      filteredSellerCalves.forEach((calf) => {
        const key = (calf.seller || "Unknown").toString().trim() || "Unknown"
        accumulator.set(key, (accumulator.get(key) || 0) + 1)
      })
      return [...accumulator.entries()]
        .map(([seller, totalCalves]) => ({ seller, totalCalves }))
        .sort((a, b) => b.totalCalves - a.totalCalves)
    }, [filteredSellerCalves])
    const breedSummaryTotal = useMemo(
      () => breedSummaryRows.reduce((sum, row) => sum + Number(row.totalCalves || 0), 0),
      [breedSummaryRows]
    )
    const sellerSummaryTotal = useMemo(
      () => sellerSummaryRows.reduce((sum, row) => sum + Number(row.totalCalves || 0), 0),
      [sellerSummaryRows]
    )
    const activeBreeds = [...new Set(calves.map((calf) => calf.breed).filter(Boolean))].length
    const activeSellers = [...new Set(calves.map((calf) => calf.seller).filter(Boolean))].length

    const getCalfDate = (calf) => calf.dateIn || calf.placedDate || null
    const getManageStatusKey = useCallback((calf) => {
      const rawStatus = String(calf?.status || "").trim().toLowerCase()
      const hasDeathDate = Boolean(calf?.deathDate || calf?.death_date)
      const currentRouteRanchId = Number(id)
      const calfCurrentRanchId = Number(calf?.currentRanchID)

      if (hasDeathDate || rawStatus === "dead" || rawStatus === "deceased") {
        return "dead"
      }

      if (
        rawStatus === "feeding" &&
        Number.isFinite(currentRouteRanchId) &&
        Number.isFinite(calfCurrentRanchId) &&
        calfCurrentRanchId !== currentRouteRanchId
      ) {
        return "shipped"
      }

      if (rawStatus === "feeding") return "feeding"
      if (rawStatus === "shipped") return "shipped"
      if (rawStatus === "sold") return "sold"
      if (rawStatus === "alive") return "alive"

      return rawStatus || ""
    }, [id])

    const filteredManageCalves = useMemo(() => {
      const bulkTokens = bulkTagSearch
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)

      return calves.filter((calf) => {
        const tagValue = `${calf.primaryID || ""} ${calf.EID || ""} ${calf.backTag || calf.originalID || ""}`.toLowerCase()
        const tagMatch = !tagSearch || tagValue.includes(tagSearch.toLowerCase())
        const multiTagMatch = bulkTokens.length === 0 || bulkTokens.some((token) => tagValue.includes(token))
        const searchModeMatch = manageSearchMode === "multi" ? multiTagMatch : tagMatch
        const breedMatch = manageBreed.length === 0 || manageBreed.includes(calf.breed)
        const sellerMatch = manageSeller.length === 0 || manageSeller.includes(calf.seller)
        const statusMatch = !manageStatus || getManageStatusKey(calf) === manageStatus

        const rawDate = getCalfDate(calf)
        if (!isDateInDateRange(rawDate, dateFrom, dateTo)) return false
        return searchModeMatch && breedMatch && sellerMatch && statusMatch
      })
    }, [calves, manageSearchMode, tagSearch, bulkTagSearch, manageBreed, manageSeller, manageStatus, getManageStatusKey, dateFrom, dateTo])
    const sortedManageCalves = useMemo(
      () => sortRowsBy(
        filteredManageCalves,
        manageSort,
        {
          visualTag: (row) => row.primaryID,
          eid: (row) => row.EID,
          dateIn: (row) => row.dateIn || row.placedDate,
          deathDate: (row) => row.deathDate,
          breed: (row) => row.breed,
          purchase: (row) => row.price ?? row.purchasePrice,
          sell: (row) => row.sellPrice,
          status: (row) => getManageStatusKey(row),
        }
      ),
      [filteredManageCalves, manageSort, getManageStatusKey]
    )
    const effectiveManageRowLimit = useMemo(() => {
      const parsed = manageRowLimit === "" ? Number.NaN : Number(manageRowLimit)
      const safePageSize = Number.isFinite(parsed)
        ? Math.max(0, Math.min(1000, parsed))
        : 15
      return safePageSize === 0 ? Math.max(1, sortedManageCalves.length) : safePageSize
    }, [manageRowLimit, sortedManageCalves.length])
    const manageTotalPages = useMemo(() => {
      if (effectiveManageRowLimit <= 0) return 1
      return Math.max(1, Math.ceil(sortedManageCalves.length / effectiveManageRowLimit))
    }, [sortedManageCalves.length, effectiveManageRowLimit])
    const effectiveManagePage = useMemo(
      () => Math.min(Math.max(managePage, 1), manageTotalPages),
      [managePage, manageTotalPages]
    )
    const managePageStart = useMemo(
      () => (sortedManageCalves.length === 0 ? 0 : (effectiveManagePage - 1) * effectiveManageRowLimit + 1),
      [sortedManageCalves.length, effectiveManagePage, effectiveManageRowLimit]
    )
    const managePageEnd = useMemo(
      () => Math.min(effectiveManagePage * effectiveManageRowLimit, sortedManageCalves.length),
      [effectiveManagePage, effectiveManageRowLimit, sortedManageCalves.length]
    )
    const manageVisiblePageNumbers = useMemo(() => {
      const windowSize = 5
      const start = Math.max(1, effectiveManagePage - Math.floor(windowSize / 2))
      const end = Math.min(manageTotalPages, start + windowSize - 1)
      const adjustedStart = Math.max(1, end - windowSize + 1)
      return Array.from({ length: end - adjustedStart + 1 }, (_, idx) => adjustedStart + idx)
    }, [effectiveManagePage, manageTotalPages])
    const visibleManageCalves = useMemo(
      () => {
        if (effectiveManageRowLimit <= 0) return []
        const startIndex = (effectiveManagePage - 1) * effectiveManageRowLimit
        return sortedManageCalves.slice(startIndex, startIndex + effectiveManageRowLimit)
      },
      [sortedManageCalves, effectiveManageRowLimit, effectiveManagePage]
    )
    const sortedBreedSummaryRows = useMemo(
      () => sortRowsBy(breedSummaryRows, breedSummarySort),
      [breedSummaryRows, breedSummarySort]
    )
    const sortedSellerSummaryRows = useMemo(
      () => sortRowsBy(sellerSummaryRows, sellerSummarySort),
      [sellerSummaryRows, sellerSummarySort]
    )

    const manageStatusBadge = (calf) => {
      const statusKey = getManageStatusKey(calf)

      if (statusKey === "dead") {
        return <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Dead</span>
      }

      if (statusKey === "feeding") {
        return <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Feeding</span>
      }

      if (statusKey === "shipped") {
        return <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">Shipped</span>
      }

      if (statusKey === "sold") {
        return <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Sold</span>
      }

      if (statusKey === "alive") {
        return <span className="inline-flex items-center rounded-full border border-lime-200 bg-lime-100 px-2 py-0.5 text-xs font-semibold text-lime-700">Alive</span>
      }

      return calf?.status || "-"
    }

    useEffect(() => {
      if (!isManageMode) return
      const allowed = new Set(filteredManageCalves.map((calf) => calf.id))
      setSelectedIds((prev) => prev.filter((idValue) => allowed.has(idValue)))
    }, [isManageMode, filteredManageCalves])
    useEffect(() => {
      setManagePage(1)
    }, [filteredManageCalves, effectiveManageRowLimit, isManageMode])

    const handleRowClick = async (row) => {
      if (!token || !row?.id) return

      try {
        setSelectedCalf(row)
        setSelectedCalfDetails(calves.find((item) => item.id === row.id) || null)
        setLoadingHistory(true)
        const data = await getCalfMovementHistory(row.id, token)
        setMovementHistory(data)
        if (isManageMode) setIsEditing(true)
      } catch (error) {
        console.error("Error loading movement history:", error)
        setMovementHistory(null)
      } finally {
        setLoadingHistory(false)
      }
    }

    const formatDate = (value) => {
      return formatDateMMDDYYYY(value, "N/A")
    }

    const closeDetailPanel = () => {
      setSelectedCalf(null)
      setSelectedCalfDetails(null)
      setMovementHistory(null)
      setLoadingHistory(false)
      setIsEditing(false)
    }

    const selectedCalfInfo = selectedCalfDetails || movementHistory?.calf || null

    const detailRows = selectedCalfInfo ? [
      { label: "Visual Tag", value: selectedCalfInfo.primaryID || selectedCalf?.visualTag || "-" },
      { label: "EID", value: selectedCalfInfo.EID || selectedCalf?.eid || "-" },
      { label: "Back Tag", value: selectedCalfInfo.backTag || selectedCalfInfo.originalID || "-" },
      {
        label: "Date In",
        value: formatDate(selectedCalfInfo.dateIn || selectedCalfInfo.placedDate)
      },
      {
        label: "Breed",
        value: selectedCalfInfo.breed
          ? selectedCalfInfo.breed.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
          : selectedCalf?.breed || "-"
      },
      {
        label: "Sex",
        value: selectedCalfInfo.sex
          ? selectedCalfInfo.sex.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
          : selectedCalf?.sex || "-"
      },
      { label: "Weight", value: selectedCalfInfo.weight ?? "-" },
      { label: "Weight Category", value: getWeightCategoryLabel(selectedCalfInfo.weight, effectiveWeightCategories) },
      {
        label: "Purchase Price",
        value: selectedCalfInfo.purchasePrice || selectedCalfInfo.price
          ? `$${Number(selectedCalfInfo.purchasePrice || selectedCalfInfo.price).toLocaleString()}`
          : "-"
      },
      {
        label: "Sell Price",
        value: selectedCalfInfo.sellPrice
          ? `$${Number(selectedCalfInfo.sellPrice).toLocaleString()}`
          : "-"
      },
      { label: "Seller", value: selectedCalfInfo.seller || "-" },
      { label: "Dairy", value: selectedCalfInfo.dairy || "-" },
      { label: "Status", value: selectedCalfInfo.status || "-" },
      { label: "Protein Level", value: selectedCalfInfo.proteinLevel ?? "-" },
      { label: "Protein Test", value: selectedCalfInfo.proteinTest || "-" },
      { label: "Death Date", value: formatDate(selectedCalfInfo.deathDate) },
      { label: "Pre Days On Feed", value: selectedCalfInfo.preDaysOnFeed ?? "-" },
      { label: "Days On Feed", value: calculateDaysOnFeed(selectedCalfInfo) },
      { label: "Created At", value: formatDate(selectedCalfInfo.createdAt) },
      { label: "Updated At", value: formatDate(selectedCalfInfo.updatedAt) },
    ] : []

    const toNumberOrNull = (value) => {
      if (value === "" || value === null || value === undefined) return null
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }

    const saveEditedCalf = async (form) => {
      if (!selectedCalf?.id || !token) return
      try {
        setIsSaving(true)
        const payload = {
          ...form,
          weight: toNumberOrNull(form.weight),
          purchasePrice: toNumberOrNull(form.purchasePrice),
          sellPrice: toNumberOrNull(form.sellPrice),
          proteinLevel: toNumberOrNull(form.proteinLevel),
          preDaysOnFeed: toNumberOrNull(form.preDaysOnFeed),
          deathDate: form.deathDate || null,
          shippedOutDate: form.shippedOutDate || null,
          status: form.status ? String(form.status).toLowerCase().trim() : null,
        }

        const updated = await updateCalf(selectedCalf.id, payload, token)
        setCalves((prev) => prev.map((calf) => (calf.id === selectedCalf.id ? { ...calf, ...updated } : calf)))
        setSelectedCalfDetails((prev) => ({ ...(prev || {}), ...updated }))

        const history = await getCalfMovementHistory(selectedCalf.id, token)
        setMovementHistory(history)
        setIsEditing(false)
      } catch (error) {
        console.error("Error updating calf:", error)
      } finally {
        setIsSaving(false)
      }
    }

    const toggleSelectRow = (calfId) => {
      setSelectedIds((prev) => (
        prev.includes(calfId)
          ? prev.filter((idValue) => idValue !== calfId)
          : [...prev, calfId]
      ))
    }

    const toggleSelectAll = () => {
      const filteredIds = filteredManageCalves.map((calf) => calf.id)
      const allSelected = filteredIds.length > 0 && filteredIds.every((idValue) => selectedIds.includes(idValue))
      setSelectedIds(allSelected ? [] : filteredIds)
    }

    const openManageEdit = (calf) => {
      setSelectedCalf({ id: calf.id, visualTag: calf.primaryID || "-" })
      setSelectedCalfDetails(calf)
      setIsEditing(true)
    }

    const handleExportExcel = () => {
      const exportSource = applyCalfFilters(calves, {
        search: mainSearch,
        searchMode: mainSearchMode,
        searchMatch: mainSearchMatch,
        searchField: mainSearchField,
        breed: mainBreed,
        seller: mainSeller,
        weightCategory: mainWeightCategory,
        weightCategories: effectiveWeightCategories,
        dateFrom: mainDateFrom,
        dateTo: mainDateTo,
      })

      const exportRows = exportSource.map((calf) => ({
        "Visual Tag": calf.primaryID || calf.visualTag || "",
        EID: calf.EID || calf.eid || "",
        "Back Tag": calf.backTag || calf.originalID || "",
        "Date In": formatDateForExport(calf.dateIn || calf.placedDate),
        "Weight Category": getWeightCategoryLabel(calf.weight, effectiveWeightCategories),
        Breed: calf.breed || "",
        Sex: calf.sex || "",
        Weight: calf.weight ?? "",
        "Purchase Price": calf.purchasePrice ?? calf.price ?? "",
        "Sell Price": calf.sellPrice ?? "",
        Seller: calf.seller || "",
        Dairy: calf.dairy || "",
        Status: calf.status || "",
        "Protein Level": calf.proteinLevel ?? "",
        "Protein Test": calf.proteinTest || "",
        "Death Date": formatDateForExport(calf.deathDate),
        "Shipped Out Date": formatDateForExport(calf.shippedOutDate),
        "Shipped To": calf.shippedTo || "",
        "Pre Days On Feed": calf.preDaysOnFeed ?? "",
        "Days On Feed": calculateDaysOnFeed(calf),
        "Origin Ranch ID": calf.originRanchID ?? "",
        "Current Ranch ID": calf.currentRanchID ?? "",
      }))

      const worksheet = XLSX.utils.json_to_sheet(exportRows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory")
      const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" })
      const ranchName = String(ranch?.name || "ranch").trim().replace(/\s+/g, "-").toLowerCase()
      saveAs(
        new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `inventory-${ranchName}-${new Date().toISOString().slice(0, 10)}.xlsx`
      )
    }

    const applyBulkUpdate = async () => {
      if (!token || selectedIds.length === 0 || !bulkField) return
      if (bulkValue === "" || bulkValue === null || bulkValue === undefined) {
        setManageMessage("Set a value before applying bulk edit.")
        return
      }

      const numericFields = new Set(["purchasePrice", "sellPrice", "proteinLevel", "weight", "preDaysOnFeed"])
      let normalizedValue = bulkValue
      if (numericFields.has(bulkField)) {
        const parsed = Number(bulkValue)
        if (!Number.isFinite(parsed)) {
          setManageMessage("Value must be numeric for this field.")
          return
        }
        normalizedValue = parsed
      }

      let fieldToUpdate = bulkField

      if (fieldToUpdate === "status" || fieldToUpdate === "sex" || fieldToUpdate === "proteinTest") {
        const nextStatus = String(bulkValue).toLowerCase().trim()
        if (fieldToUpdate === "status") {
          if (nextStatus === "dead" || nextStatus === "deceased" || nextStatus === "deaseaced") {
            normalizedValue = "deceased"
          } else {
            normalizedValue = nextStatus
          }
        } else {
          normalizedValue = nextStatus
        }
      }

      if (fieldToUpdate === "breed" || fieldToUpdate === "dairy" || fieldToUpdate === "seller" || fieldToUpdate === "shippedTo") {
        normalizedValue = String(bulkValue).trim()
      }

      setBulkLoading(true)
      setManageMessage("")
      const previousSnapshotById = new Map()
      selectedIds.forEach((calfId) => {
        const previous = calves.find((calf) => calf.id === calfId)
        if (previous) previousSnapshotById.set(calfId, { ...previous })
      })

      let updatedCount = 0
      let failedCount = 0
      const updatedMap = new Map()

      try {
        for (const calfId of selectedIds) {
          try {
            const updated = await updateCalf(calfId, { [fieldToUpdate]: normalizedValue }, token)
            updatedMap.set(calfId, updated)
            updatedCount += 1
          } catch (error) {
            const detail = error?.response?.data?.message || error?.response?.data || error?.message || "Unknown error"
            console.error("Error bulk updating calf:", detail)
            failedCount += 1
          }
        }

        setCalves((prev) => prev.flatMap((calf) => {
          const serverUpdated = updatedMap.get(calf.id)
          if (!serverUpdated) return [calf]

          const merged = { ...calf, ...serverUpdated }
          return [merged]
        }))

        setSelectedIds((prev) => prev.filter((idValue) => !updatedMap.has(idValue)))
        if (updatedMap.size > 0) {
          setLastBulkChange({
            field: fieldToUpdate,
            rows: [...updatedMap.keys()].map((calfId) => ({
              id: calfId,
              previous: previousSnapshotById.get(calfId) || null,
            })),
          })
          setLastDeletedCalves([])
        }
        if (failedCount > 0 && updatedCount === 0) {
          setManageMessage(`Bulk edit failed. Failed: ${failedCount}. Check backend logs or API error details.`)
        } else {
          setManageMessage(`Bulk edit complete. Updated: ${updatedCount}, Failed: ${failedCount}.`)
        }
      } finally {
        setBulkLoading(false)
      }
    }

    const handleUndoBulkUpdate = async () => {
      if (!token || bulkLoading || !lastBulkChange?.rows?.length) return

      const confirmed = await confirmAction({
        title: "Undo Bulk Edit",
        message: `Undo last bulk change on ${lastBulkChange.rows.length} calves?`,
        confirmText: "YES",
        cancelText: "NO",
      })
      if (!confirmed) return

      const field = lastBulkChange.field
      const updatedMap = new Map()
      let failedCount = 0

      setBulkLoading(true)
      setManageMessage("")
      try {
        for (const row of lastBulkChange.rows) {
          try {
            const previous = row.previous || {}
            let revertValue

            if (field === "purchasePrice") {
              revertValue = previous.purchasePrice ?? previous.price ?? null
            } else if (field === "status") {
              const rawStatus = String(previous.status || "").toLowerCase().trim()
              revertValue = rawStatus === "dead" ? "deceased" : (rawStatus || null)
            } else {
              revertValue = previous[field]
              if (revertValue === undefined) revertValue = null
            }

            const updated = await updateCalf(row.id, { [field]: revertValue }, token)
            updatedMap.set(row.id, updated)
          } catch {
            failedCount += 1
          }
        }

        setCalves((prev) => prev.flatMap((calf) => {
          const serverUpdated = updatedMap.get(calf.id)
          if (!serverUpdated) return [calf]
          return [{ ...calf, ...serverUpdated }]
        }))

        if (failedCount > 0) {
          setManageMessage(`Undo complete with errors. Restored: ${updatedMap.size}, Failed: ${failedCount}.`)
        } else {
          setManageMessage(`Undo complete. Restored: ${updatedMap.size}.`)
        }
        showSuccess(`Undo complete. Restored: ${updatedMap.size}, Failed: ${failedCount}.`, "Undo")
        setLastBulkChange(null)
      } finally {
        setBulkLoading(false)
      }
    }

    const buildRecreatePayload = (calf) => {
      const rawStatus = String(calf?.status || "feeding").toLowerCase().trim()
      const payload = {
        primaryID: calf?.primaryID || calf?.visualTag || "",
        EID: calf?.EID || "",
        backTag: calf?.backTag || calf?.originalID || "",
        dateIn: calf?.dateIn || calf?.placedDate || "",
        breed: calf?.breed || "",
        sex: calf?.sex || "bull",
        weight: calf?.weight,
        purchasePrice: calf?.purchasePrice ?? calf?.price,
        sellPrice: calf?.sellPrice,
        seller: calf?.seller || "",
        dairy: calf?.dairy,
        status: rawStatus === "dead" ? "deceased" : rawStatus,
        proteinLevel: calf?.proteinLevel,
        proteinTest: calf?.proteinTest,
        deathDate: calf?.deathDate,
        shippedOutDate: calf?.shippedOutDate,
        shippedTo: calf?.shippedTo,
        preDaysOnFeed: calf?.preDaysOnFeed,
        currentRanchID: calf?.currentRanchID,
        originRanchID: calf?.originRanchID,
      }
      return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
    }

    const handleUndoDeletedCalves = async () => {
      if (!token || bulkLoading || lastDeletedCalves.length === 0) return
      const confirmed = await confirmAction({
        title: "Undo Delete",
        message: `Restore ${lastDeletedCalves.length} deleted calves?`,
        confirmText: "YES",
        cancelText: "NO",
      })
      if (!confirmed) return

      let restoredCount = 0
      let failedCount = 0
      const restoredRows = []

      setBulkLoading(true)
      setManageMessage("")
      try {
        for (const calf of lastDeletedCalves) {
          try {
            const restored = await createCalf(buildRecreatePayload(calf), token)
            restoredRows.push(restored)
            restoredCount += 1
          } catch {
            failedCount += 1
          }
        }

        if (restoredRows.length > 0) {
          setCalves((prev) => [...restoredRows, ...prev])
        }
        setLastDeletedCalves([])
        setLastBulkChange(null)
        setManageMessage(`Undo delete complete. Restored: ${restoredCount}, Failed: ${failedCount}.`)
        showSuccess(`Undo delete complete. Restored: ${restoredCount}, Failed: ${failedCount}.`, "Undo")
      } finally {
        setBulkLoading(false)
      }
    }

    const handleBulkDeleteSelected = async () => {
      if (!token || selectedIds.length === 0 || bulkLoading) return

      const confirmed = await confirmAction({
        title: "Delete Calves",
        message: `Delete ${selectedIds.length} selected calves? This action cannot be undone.`,
        confirmText: "YES",
        cancelText: "NO",
      })
      if (!confirmed) return

      setBulkLoading(true)
      setManageMessage("")
      const deletedCandidates = calves.filter((calf) => selectedIds.includes(calf.id))

      let deletedCount = 0
      let failedCount = 0
      const deletedSet = new Set()

      try {
        for (const calfId of selectedIds) {
          try {
            await deleteCalf(calfId, token)
            deletedSet.add(calfId)
            deletedCount += 1
          } catch (error) {
            const detail = error?.response?.data?.message || error?.response?.data || error?.message || "Unknown error"
            console.error("Error bulk deleting calf:", detail)
            failedCount += 1
          }
        }

        if (deletedSet.size > 0) {
          setCalves((prev) => prev.filter((calf) => !deletedSet.has(calf.id)))
          setSelectedIds((prev) => prev.filter((idValue) => !deletedSet.has(idValue)))
          setLastDeletedCalves(deletedCandidates.filter((calf) => deletedSet.has(calf.id)))
          setLastBulkChange(null)
        }

        if (failedCount > 0 && deletedCount === 0) {
          setManageMessage(`Bulk delete failed. Failed: ${failedCount}. Check backend logs or API error details.`)
          showError(`Bulk delete failed. Failed: ${failedCount}.`)
        } else {
          setManageMessage(`Bulk delete complete. Deleted: ${deletedCount}, Failed: ${failedCount}.`)
          showSuccess(`Bulk delete complete. Deleted: ${deletedCount}, Failed: ${failedCount}.`, "Deleted")
        }
      } finally {
        setBulkLoading(false)
      }
    }

    const handleDeleteCalf = async () => {
      if (!selectedCalf?.id || !token) return
      const confirmed = await confirmAction({
        title: "Delete Calf",
        message: `Delete calf "${selectedCalf.visualTag || selectedCalf.id}"? This action cannot be undone.`,
        confirmText: "YES",
        cancelText: "NO",
      })
      if (!confirmed) return

      try {
        const deletedSnapshot = calves.find((calf) => calf.id === selectedCalf.id)
        await deleteCalf(selectedCalf.id, token)
        setCalves((prev) => prev.filter((calf) => calf.id !== selectedCalf.id))
        setSelectedIds((prev) => prev.filter((idValue) => idValue !== selectedCalf.id))
        setLastDeletedCalves(deletedSnapshot ? [deletedSnapshot] : [])
        setLastBulkChange(null)
        closeDetailPanel()
        showSuccess(`Calf "${selectedCalf.visualTag || selectedCalf.id}" deleted successfully.`, "Deleted")
      } catch (error) {
        console.error("Error deleting calf:", error)
        showError(error?.response?.data?.message || "Could not delete calf.")
      }
    }

    if (!ranch || loadingInventory) {
      return <RanchPageSkeleton />
    }

    return (
      <div className="w-full flex flex-col gap-6 px-4 md:px-6 py-6">
        {isManageMode && (
          <div className="rounded-2xl border border-primary-border/30 bg-white p-5 shadow-sm space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-secondary">Manage Calves</p>
                <h3 className="mt-1 text-lg font-semibold text-primary-text">Smart Batch Editor</h3>
                <p className="mt-1 text-xs text-secondary">
                Filter by period and tag, then edit calves individually or in bulk.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 min-w-[210px]">
                <div className="rounded-xl border border-primary-border/30 bg-primary-border/10 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-secondary">Filtered</p>
                  <p className="text-base font-semibold text-primary-text">{filteredManageCalves.length}</p>
                </div>
                <div className="rounded-xl border border-action-blue/30 bg-action-blue/10 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-action-blue/80">Selected</p>
                  <p className="text-base font-semibold text-action-blue">{selectedIds.length}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-[120px_1.2fr_240px_170px_90px_100px] gap-2 rounded-xl border border-primary-border/20 bg-primary-border/5 p-3">
              <div>
                <label className="text-xs font-semibold text-secondary">Search Type</label>
                <select
                  className="w-full h-[36px] rounded-xl border border-primary-border/40 px-2.5 py-1.5 text-xs"
                  value={manageSearchMode}
                  onChange={(e) => setManageSearchMode(e.target.value)}
                >
                  <option value="single">Single Tag</option>
                  <option value="multi">Multiple Tags</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">
                  {manageSearchMode === "multi" ? "Multi Tag Search" : "Search by Tag"}
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-secondary" />
                  <input
                    className="w-full h-[36px] rounded-xl border border-primary-border/40 pl-8 pr-9 py-1.5 text-xs"
                    placeholder={
                      manageSearchMode === "multi"
                        ? "TAG-001, TAG-002, TAG-003"
                        : "Visual Tag / EID / Back Tag"
                    }
                    value={manageSearchMode === "multi" ? bulkTagSearch : tagSearch}
                    onChange={(e) => {
                      if (manageSearchMode === "multi") {
                        setBulkTagSearch(e.target.value)
                        return
                      }
                      setTagSearch(e.target.value)
                    }}
                  />
                  {(tagSearch || bulkTagSearch) && (
                    <button
                      type="button"
                      onClick={() => {
                        setTagSearch("")
                        setBulkTagSearch("")
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-secondary hover:bg-primary-border/10"
                      aria-label="Clear search"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="pt-[22px]">
                <BreedSellerFilterMenu
                  className="w-full h-[36px]"
                  breed={manageBreed}
                  seller={manageSeller}
                  status={manageStatus}
                  breedOptions={breedOptions}
                  sellerOptions={sellerOptions}
                  statusOptions={["feeding", "shipped", "sold", "alive", "dead"]}
                  showStatus
                  onChange={({ breed, seller, status }) => {
                    setManageBreed(Array.isArray(breed) ? breed : (breed ? [breed] : []))
                    setManageSeller(Array.isArray(seller) ? seller : (seller ? [seller] : []))
                    setManageStatus(status || "")
                  }}
                />
              </div>
              <div className="pt-[22px]">
                <DateFilterMenu
                  className="w-full h-[36px]"
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onChange={({ from, to }) => {
                    setDateFrom(from)
                    setDateTo(to)
                  }}
                />
              </div>
              <div className="pt-[22px]">
                <input
                  type="number"
                  max={1000}
                  className="w-full h-[36px] rounded-xl border border-primary-border/40 px-2.5 py-1.5 text-xs"
                  value={manageRowLimit}
                  onChange={(e) => {
                    const rawValue = e.target.value
                    if (rawValue === "") {
                      setManageRowLimit("")
                      return
                    }
                    const nextValue = Number(rawValue)
                    if (!Number.isFinite(nextValue)) return
                    setManageRowLimit(Math.max(0, Math.min(1000, nextValue)))
                  }}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setTagSearch("")
                    setBulkTagSearch("")
                    setManageBreed([])
                    setManageSeller([])
                    setManageStatus("")
                    setDateFrom("")
                    setDateTo("")
                    setManageRowLimit(15)
                    setManagePage(1)
                  }}
                  className={`w-full min-h-[40px] ${manageButtonSecondaryClass}`}
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-primary-border/20 bg-primary-border/5 p-3 pt-3">
              <div
                className={`grid grid-cols-1 gap-2 items-end ${
                  hasUndoAction
                    ? "md:grid-cols-[180px_1fr_180px_180px_180px]"
                    : "md:grid-cols-[180px_1fr_1fr_1fr]"
                }`}
              >
                <div>
                  <label className="text-xs font-semibold text-secondary">Field</label>
                  <select
                    className="w-full h-[36px] rounded-xl border border-primary-border/40 px-2.5 py-1.5 text-xs"
                    value={bulkField}
                    onChange={(e) => {
                      const nextField = e.target.value
                      setBulkField(nextField)
                      if (nextField === "status") {
                        setBulkValue("feeding")
                      } else if (bulkValue === "feeding" || bulkValue === "alive" || bulkValue === "shipped" || bulkValue === "sold" || bulkValue === "dead") {
                        setBulkValue("")
                      }
                    }}
                  >
                    <option value="purchasePrice">Purchase Price</option>
                    <option value="sellPrice">Sell Price</option>
                    <option value="breed">Breed</option>
                    <option value="seller">Seller</option>
                    <option value="status">Status</option>
                    <option value="deathDate">Death Date</option>
                    <option value="dairy">Dairy</option>
                    <option value="proteinLevel">Protein Level</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary">New Value</label>
                  {bulkField === "status" ? (
                    <select
                      className="w-full h-[36px] rounded-xl border border-primary-border/40 px-2.5 py-1.5 text-xs"
                      value={bulkValue || "feeding"}
                      onChange={(e) => setBulkValue(e.target.value)}
                    >
                      {bulkStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={bulkField === "deathDate" ? "date" : "text"}
                      className="w-full h-[36px] rounded-xl border border-primary-border/40 px-2.5 py-1.5 text-xs"
                      value={bulkValue}
                      onChange={(e) => setBulkValue(e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    disabled={bulkLoading || selectedIds.length === 0}
                    onClick={applyBulkUpdate}
                    className={`w-full ${manageButtonPrimaryClass}`}
                  >
                    {bulkLoading ? "Applying..." : `Apply to ${selectedIds.length} selected`}
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    disabled={bulkLoading || selectedIds.length === 0}
                    onClick={handleBulkDeleteSelected}
                    className="w-full h-[36px] rounded-xl border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                  >
                    {bulkLoading ? "Deleting..." : `Delete ${selectedIds.length} selected`}
                  </button>
                </div>
                {hasUndoAction && (
                  <div>
                    <button
                      type="button"
                      disabled={bulkLoading}
                      onClick={lastDeletedCalves.length > 0 ? handleUndoDeletedCalves : handleUndoBulkUpdate}
                      className={`w-full ${manageButtonSecondaryClass}`}
                    >
                      {lastDeletedCalves.length > 0 ? "Undo last delete" : "Undo last change"}
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-secondary">Bulk update runs over selected calves only.</p>
            </div>

            {manageMessage && (
              <p className="rounded-lg border border-primary-border/20 bg-primary-border/10 px-3 py-2 text-xs text-primary-text">{manageMessage}</p>
            )}

            <div className="overflow-x-auto border border-primary-border/30 rounded-xl bg-white">
              <table className="min-w-full border-collapse">
                <thead className="bg-primary-border/10">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs">
                      <input
                        type="checkbox"
                        checked={filteredManageCalves.length > 0 && filteredManageCalves.every((calf) => selectedIds.includes(calf.id))}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort(setManageSort, "visualTag")}>Visual Tag <span>{manageSort.key === "visualTag" ? (manageSort.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                    <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort(setManageSort, "eid")}>EID <span>{manageSort.key === "eid" ? (manageSort.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                    <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort(setManageSort, "dateIn")}>Date In <span>{manageSort.key === "dateIn" ? (manageSort.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                    <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort(setManageSort, "breed")}>Breed <span>{manageSort.key === "breed" ? (manageSort.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                    <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort(setManageSort, "purchase")}>Purchase <span>{manageSort.key === "purchase" ? (manageSort.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                    <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort(setManageSort, "sell")}>Sell <span>{manageSort.key === "sell" ? (manageSort.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                    <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort(setManageSort, "status")}>Status <span>{manageSort.key === "status" ? (manageSort.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                    <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort(setManageSort, "deathDate")}>Death Date <span>{manageSort.key === "deathDate" ? (manageSort.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleManageCalves.map((calf) => (
                    <tr
                      key={calf.id}
                      className="border-t border-primary-border/20 hover:bg-primary-border/5 cursor-pointer"
                      onClick={() => openManageEdit(calf)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(calf.id)}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleSelectRow(calf.id)}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">{calf.primaryID || "-"}</td>
                      <td className="px-3 py-2 text-sm">{calf.EID || "-"}</td>
                      <td className="px-3 py-2 text-sm">{formatDateCell(calf.dateIn || calf.placedDate)}</td>
                      <td className="px-3 py-2 text-sm">{calf.breed || "-"}</td>
                      <td className="px-3 py-2 text-sm">{calf.price ?? calf.purchasePrice ?? "-"}</td>
                      <td className="px-3 py-2 text-sm">{calf.sellPrice ?? "-"}</td>
                      <td className="px-3 py-2 text-sm">{manageStatusBadge(calf)}</td>
                      <td className="px-3 py-2 text-sm">{formatDateMMDDYYYY(calf.deathDate, "N/A")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 border border-primary-border/20 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-secondary">
                Showing {managePageStart}-{managePageEnd} of {sortedManageCalves.length}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  className="rounded-lg border border-primary-border/40 px-2 py-1 text-xs disabled:opacity-50"
                  onClick={() => setManagePage(1)}
                  disabled={effectiveManagePage === 1}
                >
                  First
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-primary-border/40 px-2 py-1 text-xs disabled:opacity-50"
                  onClick={() => setManagePage((prev) => Math.max(1, prev - 1))}
                  disabled={effectiveManagePage === 1}
                >
                  Prev
                </button>
                {manageVisiblePageNumbers.map((pageNumber) => (
                  <button
                    key={`manage-page-${pageNumber}`}
                    type="button"
                    className={`rounded-lg border px-2 py-1 text-xs ${
                      pageNumber === effectiveManagePage
                        ? "border-action-blue/80 bg-action-blue text-white"
                        : "border-primary-border/40 hover:bg-primary-border/10"
                    }`}
                    onClick={() => setManagePage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  className="rounded-lg border border-primary-border/40 px-2 py-1 text-xs disabled:opacity-50"
                  onClick={() => setManagePage((prev) => Math.min(manageTotalPages, prev + 1))}
                  disabled={effectiveManagePage === manageTotalPages}
                >
                  Next
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-primary-border/40 px-2 py-1 text-xs disabled:opacity-50"
                  onClick={() => setManagePage(manageTotalPages)}
                  disabled={effectiveManagePage === manageTotalPages}
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}
        {!isManageMode && (
          <>
            <div className="rounded-2xl border border-primary-border/30 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-secondary">Inventory</p>
                  <h2 className="mt-1 text-xl font-semibold text-primary-text">Current Ranch Inventory</h2>
                  <p className="mt-1 text-sm text-secondary">
                    Explore active calves in inventory, then drill down into movement history and editing.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-[320px]">
                  <div className="rounded-xl border border-action-blue/30 bg-action-blue/10 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-action-blue/80">Main Table</p>
                    <p className="text-lg font-semibold text-action-blue">{filteredMainCalves.length} / {calves.length}</p>
                  </div>
                  <div className="rounded-xl border border-primary-border/40 bg-primary-border/10 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-secondary">Breeds</p>
                    <p className="text-lg font-semibold text-primary-text">{activeBreeds}</p>
                  </div>
                  <div className="rounded-xl border border-primary-border/40 bg-primary-border/10 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-secondary">Sellers</p>
                    <p className="text-lg font-semibold text-primary-text">{activeSellers}</p>
                  </div>
                </div>
              </div>
            </div>
            <MainDataTable
              title="Inventory"
              rows={tableRows}
              enablePagination
              pageSize={mainRowLimit}
              columns={tableColumns}
              onRowClick={handleRowClick}
              selectedRowKey={selectedCalf?.id}
              filters={
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
                        className="h-[40px] w-full rounded-xl border border-primary-border/40 pl-9 pr-9 text-xs"
                        placeholder={getMainSearchPlaceholder(mainSearchMode, mainSearchField)}
                        value={mainSearch}
                        onChange={(e) => setMainSearch(e.target.value)}
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
                    {mainSearchMode === "multiple" && (
                      <p className="sm:col-span-2 text-xs text-secondary">
                        Multiple values must be separated by comma.
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 xl:flex-1 xl:min-w-[620px]">
                    <BreedSellerFilterMenu
                      className="w-full"
                      breed={mainBreed}
                      seller={mainSeller}
                      weightCategory={mainWeightCategory}
                      breedOptions={breedOptions}
                      sellerOptions={sellerOptions}
                      weightCategoryOptions={weightCategoryOptions}
                      showWeightCategory
                      onChange={({ breed, seller, weightCategory }) => {
                        setMainBreed(Array.isArray(breed) ? breed : (breed ? [breed] : []))
                        setMainSeller(Array.isArray(seller) ? seller : (seller ? [seller] : []))
                        setMainWeightCategory(weightCategory || "")
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
                      className="w-full rounded-xl border border-primary-border/40 px-3 py-2 text-xs"
                      value={mainRowLimit}
                      onChange={(e) => {
                        const rawValue = e.target.value
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
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary-border/40 px-3 py-1.5 text-xs hover:bg-primary-border/10"
                      onClick={handleExportExcel}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-primary-border/40 px-3 py-1.5 text-xs hover:bg-primary-border/10"
                      onClick={() => {
                        setMainSearch("")
                        setMainSearchMode("single")
                        setMainSearchMatch("contains")
                        setMainSearchField("all")
                        setMainBreed([])
                        setMainSeller([])
                        setMainWeightCategory("")
                        setMainDateFrom("")
                        setMainDateTo("")
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              }
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-6">
              <div className="h-fit rounded-2xl border border-primary-border/30 bg-white shadow-sm overflow-visible">
                <div className="px-4 py-3 border-b border-primary-border/20">
                  <h3 className="text-sm font-semibold text-primary-text">Breed Summary</h3>
                </div>
                <div className="p-3 border-b border-primary-border/20 bg-primary-border/5">
                  <div className="flex flex-wrap lg:flex-nowrap items-stretch gap-2">
                    <BreedSellerFilterMenu
                      className="w-[150px] shrink-0"
                      breed={breedFilterSeller}
                      seller={[]}
                      showBreed
                      showSeller={false}
                      breedOptions={breedOptions}
                      onChange={({ breed }) => {
                        setBreedFilterSeller(Array.isArray(breed) ? breed : (breed ? [breed] : []))
                      }}
                    />
                    <DateFilterMenu
                      className="w-[150px] shrink-0"
                      dateFrom={breedDateFrom}
                      dateTo={breedDateTo}
                      onChange={({ from, to }) => {
                        setBreedDateFrom(from)
                        setBreedDateTo(to)
                      }}
                    />
                    <button
                      type="button"
                      className="w-[90px] shrink-0 rounded-lg border border-primary-border/40 px-3 py-1.5 text-xs hover:bg-primary-border/10"
                      onClick={() => {
                        setBreedFilterSeller([])
                        setBreedDateFrom("")
                        setBreedDateTo("")
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-primary-border/10">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wide"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort(setBreedSummarySort, "breed")}>Breed <span>{breedSummarySort.key === "breed" ? (breedSummarySort.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wide"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort(setBreedSummarySort, "totalCalves")}>Total Calves <span>{breedSummarySort.key === "totalCalves" ? (breedSummarySort.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBreedSummaryRows.map((row, index) => (
                        <tr key={`breed-${row.breed}`} className="border-t border-primary-border/20">
                          <td className="px-4 py-3 text-sm text-primary-text">
                            <span className="mr-2 inline-flex min-w-6 justify-center rounded-md bg-primary-border/15 px-1.5 py-0.5 text-xs text-secondary">
                              {index + 1}
                            </span>
                            {row.breed}
                          </td>
                          <td className="px-4 py-3 text-sm text-primary-text">{row.totalCalves}</td>
                        </tr>
                      ))}
                      {sortedBreedSummaryRows.length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-4 py-8 text-sm text-secondary text-center">No data available.</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-primary-border/5">
                      <tr className="border-t border-primary-border/30">
                        <td className="px-4 py-3 text-sm font-semibold text-primary-text">Total</td>
                        <td className="px-4 py-3 text-sm font-semibold text-primary-text">{breedSummaryTotal}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="h-fit rounded-2xl border border-primary-border/30 bg-white shadow-sm overflow-visible">
                <div className="px-4 py-3 border-b border-primary-border/20">
                  <h3 className="text-sm font-semibold text-primary-text">Seller Summary</h3>
                </div>
                <div className="p-3 border-b border-primary-border/20 bg-primary-border/5">
                  <div className="flex flex-wrap lg:flex-nowrap items-stretch gap-2">
                <BreedSellerFilterMenu
                  className="w-[150px] shrink-0"
                  breed={[]}
                  seller={sellerFilterBreed}
                  showBreed={false}
                  showSeller
                  sellerOptions={sellerOptions}
                  onChange={({ seller }) => {
                    setSellerFilterBreed(Array.isArray(seller) ? seller : (seller ? [seller] : []))
                  }}
                />
                    <DateFilterMenu
                      className="w-[150px] shrink-0"
                      dateFrom={sellerDateFrom}
                      dateTo={sellerDateTo}
                      onChange={({ from, to }) => {
                        setSellerDateFrom(from)
                        setSellerDateTo(to)
                      }}
                    />
                    <button
                      type="button"
                      className="w-[90px] shrink-0 rounded-lg border border-primary-border/40 px-3 py-1.5 text-xs hover:bg-primary-border/10"
                      onClick={() => {
                        setSellerFilterBreed([])
                        setSellerDateFrom("")
                        setSellerDateTo("")
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-primary-border/10">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wide"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort(setSellerSummarySort, "seller")}>Seller <span>{sellerSummarySort.key === "seller" ? (sellerSummarySort.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wide"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort(setSellerSummarySort, "totalCalves")}>Total Calves <span>{sellerSummarySort.key === "totalCalves" ? (sellerSummarySort.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSellerSummaryRows.map((row, index) => (
                        <tr key={`seller-${row.seller}`} className="border-t border-primary-border/20">
                          <td className="px-4 py-3 text-sm text-primary-text">
                            <span className="mr-2 inline-flex min-w-6 justify-center rounded-md bg-primary-border/15 px-1.5 py-0.5 text-xs text-secondary">
                              {index + 1}
                            </span>
                            {row.seller}
                          </td>
                          <td className="px-4 py-3 text-sm text-primary-text">{row.totalCalves}</td>
                        </tr>
                      ))}
                      {sortedSellerSummaryRows.length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-4 py-8 text-sm text-secondary text-center">No data available.</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-primary-border/5">
                      <tr className="border-t border-primary-border/30">
                        <td className="px-4 py-3 text-sm font-semibold text-primary-text">Total</td>
                        <td className="px-4 py-3 text-sm font-semibold text-primary-text">{sellerSummaryTotal}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {!isManageMode && (
          <CalfDetailPanel
            selectedCalf={selectedCalf}
            detailRows={detailRows}
            movementHistory={movementHistory}
            loadingHistory={loadingHistory}
            onClose={closeDetailPanel}
            onEdit={() => setIsEditing(true)}
            onDelete={handleDeleteCalf}
            formatDate={formatDate}
          />
        )}

        {isEditing && (
          <CalfEditModal
            calf={selectedCalfInfo}
            loading={isSaving}
            onClose={() => setIsEditing(false)}
            onSave={saveEditedCalf}
            onDelete={isManageMode ? handleDeleteCalf : undefined}
          />
        )}
      </div>
    )
}

export default Inventory
