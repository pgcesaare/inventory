import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { Download, Search, X } from "lucide-react"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import { useToken } from "../api/useToken"
import { getRanchById } from "../api/ranches"
import { getCalvesByRanch, getCalfMovementHistory, updateCalf, deleteCalf } from "../api/calves"
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

const Historical = () => {

    const { id } = useParams()
    const token = useToken()
    const { ranch, setRanch, confirmAction, showSuccess, showError } = useAppContext()
    const [calves, setCalves] = useState([])
    const [loadingHistorical, setLoadingHistorical] = useState(true)
    const [selectedCalf, setSelectedCalf] = useState(null)
    const [selectedCalfDetails, setSelectedCalfDetails] = useState(null)
    const [movementHistory, setMovementHistory] = useState(null)
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [mainSearch, setMainSearch] = useState("")
    const [mainSearchMode, setMainSearchMode] = useState("single")
    const [mainSearchMatch, setMainSearchMatch] = useState("contains")
    const [mainSearchField, setMainSearchField] = useState("all")
    const [mainBreed, setMainBreed] = useState([])
    const [mainSeller, setMainSeller] = useState([])
    const [mainStatus, setMainStatus] = useState("")
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
    const [breedSummarySort, setBreedSummarySort] = useState({ key: "totalCalves", direction: "desc" })
    const [sellerSummarySort, setSellerSummarySort] = useState({ key: "totalCalves", direction: "desc" })

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

      const fetchHistorical = async () => {
        try {
          const data = await getCalvesByRanch(id, token)
          setCalves(Array.isArray(data) ? data : [])
        } catch (err) {
          console.error("Error loading historical data:", err)
        } finally {
          setLoadingHistorical(false)
        }
      }

      fetchHistorical()
    }, [id, token])

    const tableColumns = [
      { key: "visualTag", label: "Visual Tag" },
      { key: "eid", label: "EID" },
      { key: "backTag", label: "Back Tag" },
      { key: "dateIn", label: "Date In" },
      { key: "breed", label: "Breed" },
      { key: "sex", label: "Sex" },
      { key: "purchasePrice", label: "Purchase Price" },
      { key: "status", label: "Status", align: "right" },
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
      const startValue = calf.dateIn || calf.placedDate
      const start = startValue ? new Date(startValue) : null
      const rawPre = Number(calf.preDaysOnFeed || 0)
      const preDays = Number.isFinite(rawPre) ? Math.max(0, rawPre) : 0

      if (!start || Number.isNaN(start.getTime())) return preDays

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const placedDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const diff = Math.floor((today.getTime() - placedDay.getTime()) / (1000 * 60 * 60 * 24))
      const elapsed = Math.max(0, diff) + 1
      return elapsed + preDays
    }

    const normalizeStatus = useCallback((calf) => {
      const rawStatus = String(calf.status || "").trim().toLowerCase()
      const hasDeathDate = Boolean(calf.deathDate || calf.death_date)
      const currentRouteRanchId = Number(id)
      const calfCurrentRanchId = Number(calf.currentRanchID)

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
      if (rawStatus === "feeding") {
        return "feeding"
      }
      if (rawStatus === "shipped") {
        return "shipped"
      }
      return ""
    }, [id])

    const renderStatusBadge = useCallback((statusKey) => {
      if (statusKey === "dead") {
        return (
          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-200">
            Dead
          </span>
        )
      }

      if (statusKey === "feeding") {
        return (
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/30 dark:text-emerald-200">
            Feeding
          </span>
        )
      }
      if (statusKey === "shipped") {
        return (
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:border-sky-900/50 dark:bg-sky-900/30 dark:text-sky-200">
            Shipped
          </span>
        )
      }

      return "-"
    }, [])

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
        const statusFilterValues = asArray(filters.status)
        const weightCategoryFilter = String(filters.weightCategory || "")
        const breedMatch = breedFilterValues.length === 0 || breedFilterValues.includes(calf.breed)
        const sellerMatch = sellerFilterValues.length === 0 || sellerFilterValues.includes(calf.seller)
        const statusKey = normalizeStatus(calf)
        const statusMatch = statusFilterValues.length === 0 || statusFilterValues.includes(statusKey)
        const weightCategory = getWeightCategoryLabel(calf.weight, filters.weightCategories)
        const weightCategoryMatch = !weightCategoryFilter || weightCategory === weightCategoryFilter

        const rawDate = calf.dateIn || calf.placedDate
        const dateRangeMatch = isDateInDateRange(rawDate, filters.dateFrom, filters.dateTo)

        return searchMatch && breedMatch && sellerMatch && statusMatch && weightCategoryMatch && dateRangeMatch
      })
    }, [normalizeSearchValue, normalizeStatus])

    const sortRowsBy = (sourceRows, sortConfig) => {
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
      return [...sourceRows].sort((a, b) => {
        const aValue = normalize(a?.[sortConfig.key])
        const bValue = normalize(b?.[sortConfig.key])
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
        status: mainStatus,
        weightCategory: mainWeightCategory,
        weightCategories: effectiveWeightCategories,
        dateFrom: mainDateFrom,
        dateTo: mainDateTo,
      }),
      [applyCalfFilters, calves, mainSearch, mainSearchMode, mainSearchMatch, mainSearchField, mainBreed, mainSeller, mainStatus, mainWeightCategory, effectiveWeightCategories, mainDateFrom, mainDateTo]
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
        weightCategory: getWeightCategoryLabel(calf.weight, effectiveWeightCategories),
        weight: calf.weight ?? "-",
        breed: calf.breed
          ? calf.breed.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
          : "-",
        sex: calf.sex
          ? calf.sex.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
          : "-",
        status: renderStatusBadge(normalizeStatus(calf)),
        purchasePrice: formatMoneyCell(calf.purchasePrice ?? calf.price)
      }))
    ), [filteredMainCalves, effectiveWeightCategories, normalizeStatus, renderStatusBadge])

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
    const sortedBreedSummaryRows = useMemo(
      () => sortRowsBy(breedSummaryRows, breedSummarySort),
      [breedSummaryRows, breedSummarySort]
    )
    const sortedSellerSummaryRows = useMemo(
      () => sortRowsBy(sellerSummaryRows, sellerSummarySort),
      [sellerSummaryRows, sellerSummarySort]
    )
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

    const handleRowClick = async (row) => {
      if (!token || !row?.id) return

      try {
        setSelectedCalf(row)
        setSelectedCalfDetails(calves.find((item) => item.id === row.id) || null)
        setLoadingHistory(true)
        const data = await getCalfMovementHistory(row.id, token)
        setMovementHistory(data)
      } catch (error) {
        console.error("Error loading movement history:", error)
        setMovementHistory(null)
      } finally {
        setLoadingHistory(false)
      }
    }

    const closeDetailPanel = () => {
      setSelectedCalf(null)
      setSelectedCalfDetails(null)
      setMovementHistory(null)
      setLoadingHistory(false)
      setIsEditing(false)
    }

    const formatDate = (value) => {
      return formatDateMMDDYYYY(value, "N/A")
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
          : "-"
      },
      {
        label: "Sex",
        value: selectedCalfInfo.sex
          ? selectedCalfInfo.sex.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
          : "-"
      },
      { label: "Weight", value: selectedCalfInfo.weight ?? "-" },
      { label: "Weight Category", value: getWeightCategoryLabel(selectedCalfInfo.weight, effectiveWeightCategories) },
      {
        label: "Purchase Price",
        value: selectedCalfInfo.purchasePrice ?? selectedCalfInfo.price
          ? `$${Number(selectedCalfInfo.purchasePrice ?? selectedCalfInfo.price).toLocaleString()}`
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
      {
        label: "Status",
        value: (() => {
          const normalized = normalizeStatus(selectedCalfInfo)
          if (normalized === "dead") return "Dead"
          if (normalized === "feeding") return "Feeding"
          if (normalized === "shipped") return "Shipped"
          return selectedCalfInfo.status || "-"
        })()
      },
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
        }

        const updated = await updateCalf(selectedCalf.id, payload, token)
        setCalves((prev) => prev.map((calf) => (calf.id === selectedCalf.id ? { ...calf, ...updated } : calf)))
        setSelectedCalfDetails((prev) => ({ ...(prev || {}), ...updated, ...payload }))

        const history = await getCalfMovementHistory(selectedCalf.id, token)
        setMovementHistory(history)
        setIsEditing(false)
      } catch (error) {
        console.error("Error updating calf:", error)
      } finally {
        setIsSaving(false)
      }
    }

    const getStatusLabel = (calf) => {
      const normalized = normalizeStatus(calf)
      if (normalized === "dead") return "Dead"
      if (normalized === "feeding") return "Feeding"
      if (normalized === "shipped") return "Shipped"
      return calf.status || ""
    }

    const handleExportExcel = () => {
      const exportSource = applyCalfFilters(calves, {
        search: mainSearch,
        searchMode: mainSearchMode,
        searchMatch: mainSearchMatch,
        searchField: mainSearchField,
        breed: mainBreed,
        seller: mainSeller,
        status: mainStatus,
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
        Status: getStatusLabel(calf),
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
      XLSX.utils.book_append_sheet(workbook, worksheet, "Historical")
      const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" })
      const ranchName = String(ranch?.name || "ranch").trim().replace(/\s+/g, "-").toLowerCase()
      saveAs(
        new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `historical-${ranchName}-${new Date().toISOString().slice(0, 10)}.xlsx`
      )
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
        await deleteCalf(selectedCalf.id, token)
        setCalves((prev) => prev.filter((calf) => calf.id !== selectedCalf.id))
        closeDetailPanel()
        showSuccess(`Calf "${selectedCalf.visualTag || selectedCalf.id}" deleted successfully.`, "Deleted")
      } catch (error) {
        console.error("Error deleting calf:", error)
        showError(error?.response?.data?.message || "Could not delete calf.")
      }
    }

      if (!ranch || loadingHistorical) {
        return <RanchPageSkeleton />
      }


    return (
      <div className="w-full flex flex-col gap-6 px-4 md:px-6 py-6">
        <div className="rounded-2xl border border-primary-border/30 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary">Historical</p>
              <h2 className="mt-1 text-xl font-semibold text-primary-text">Historical Placements</h2>
              <p className="mt-1 text-sm text-secondary">
                Track historical calf records by tag, breed, seller, and purchase value.
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
          title="Historical Overview"
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
                  status={mainStatus}
                  weightCategory={mainWeightCategory}
                  breedOptions={breedOptions}
                  sellerOptions={sellerOptions}
                  statusOptions={["feeding", "shipped", "sold", "alive", "dead"]}
                  weightCategoryOptions={weightCategoryOptions}
                  showStatus
                  showWeightCategory
                  onChange={({ breed, seller, status, weightCategory }) => {
                    setMainBreed(Array.isArray(breed) ? breed : (breed ? [breed] : []))
                    setMainSeller(Array.isArray(seller) ? seller : (seller ? [seller] : []))
                    setMainStatus(status || "")
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
                    setMainStatus("")
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

        {isEditing && (
          <CalfEditModal
            calf={selectedCalfInfo}
            loading={isSaving}
            onClose={() => setIsEditing(false)}
            onSave={saveEditedCalf}
          />
        )}
      </div>
    )
}

export default Historical
