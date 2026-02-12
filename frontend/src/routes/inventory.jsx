import React, { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { Search } from "lucide-react"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import { useToken } from "../api/useToken"
import { getRanchById } from "../api/ranches"
import { getInventoryByRanch, getManageCalvesByRanch, getCalfMovementHistory, updateCalf, deleteCalf } from "../api/calves"
import { useAppContext } from "../context"
import { formatDateMMDDYYYY } from "../utils/dateFormat"
import MainDataTable from "../components/shared/mainDataTable"
import DateFilterMenu from "../components/shared/dateFilterMenu"
import BreedSellerFilterMenu from "../components/shared/breedSellerFilterMenu"
import CalfDetailPanel from "../components/calves/calfDetailPanel"
import CalfEditModal from "../components/calves/calfEditModal"

const Inventory = () => {

    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const token = useToken()
    const { ranch, setRanch } = useAppContext()
    const [calves, setCalves] = useState([])
    const [loadingInventory, setLoadingInventory] = useState(true)
    const [selectedCalf, setSelectedCalf] = useState(null)
    const [selectedCalfDetails, setSelectedCalfDetails] = useState(null)
    const [movementHistory, setMovementHistory] = useState(null)
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const isManageMode = searchParams.get("mode") === "manage"
    const [selectedIds, setSelectedIds] = useState([])
    const [manageSearchMode, setManageSearchMode] = useState("single")
    const [tagSearch, setTagSearch] = useState("")
    const [bulkTagSearch, setBulkTagSearch] = useState("")
    const [manageBreed, setManageBreed] = useState("")
    const [manageSeller, setManageSeller] = useState("")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")
    const [bulkField, setBulkField] = useState("purchasePrice")
    const [bulkValue, setBulkValue] = useState("")
    const [bulkLoading, setBulkLoading] = useState(false)
    const [manageMessage, setManageMessage] = useState("")
    const [mainSearch, setMainSearch] = useState("")
    const [mainBreed, setMainBreed] = useState("")
    const [mainSeller, setMainSeller] = useState("")
    const [mainDateFrom, setMainDateFrom] = useState("")
    const [mainDateTo, setMainDateTo] = useState("")
    const [mainRowLimit, setMainRowLimit] = useState(50)

    const [breedFilterSeller, setBreedFilterSeller] = useState("")
    const [breedDateFrom, setBreedDateFrom] = useState("")
    const [breedDateTo, setBreedDateTo] = useState("")

    const [sellerFilterBreed, setSellerFilterBreed] = useState("")
    const [sellerDateFrom, setSellerDateFrom] = useState("")
    const [sellerDateTo, setSellerDateTo] = useState("")
    const [manageSort, setManageSort] = useState({ key: "", direction: "asc" })
    const [breedSummarySort, setBreedSummarySort] = useState({ key: "totalCalves", direction: "desc" })
    const [sellerSummarySort, setSellerSummarySort] = useState({ key: "totalCalves", direction: "desc" })

    const manageButtonBaseClass = "h-[36px] rounded-xl border px-2 py-1.5 text-xs font-medium transition-colors"
    const manageButtonSecondaryClass = `${manageButtonBaseClass} border-primary-border/40 text-primary-text hover:bg-primary-border/10`
    const manageButtonPrimaryClass = `${manageButtonBaseClass} border-action-blue/80 bg-action-blue text-white hover:bg-action-blue/90 disabled:opacity-60`

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
      { key: "daysOnFeed", label: "Days On Feed", align: "right" }
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

    const applyCalfFilters = (source, filters) => {
      return source.filter((calf) => {
        const haystack = `${calf.primaryID || ""} ${calf.EID || ""} ${calf.backTag || calf.originalID || ""}`.toLowerCase()
        const searchMatch = !filters.search || haystack.includes(filters.search.toLowerCase())
        const breedMatch = !filters.breed || calf.breed === filters.breed
        const sellerMatch = !filters.seller || calf.seller === filters.seller

        const rawDate = calf.dateIn || calf.placedDate
        const calfDate = rawDate ? new Date(rawDate) : null
        const fromLimit = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null
        const toLimit = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null
        const dateFromMatch = !fromLimit || (calfDate && calfDate >= fromLimit)
        const dateToMatch = !toLimit || (calfDate && calfDate <= toLimit)

        return searchMatch && breedMatch && sellerMatch && dateFromMatch && dateToMatch
      })
    }

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
      () => applyCalfFilters(calves, { search: mainSearch, breed: mainBreed, seller: mainSeller, dateFrom: mainDateFrom, dateTo: mainDateTo }),
      [calves, mainSearch, mainBreed, mainSeller, mainDateFrom, mainDateTo]
    )
    const visibleMainCalves = useMemo(
      () => filteredMainCalves.slice(0, mainRowLimit),
      [filteredMainCalves, mainRowLimit]
    )

    const filteredBreedCalves = useMemo(
      () => applyCalfFilters(calves, { search: "", breed: "", seller: breedFilterSeller, dateFrom: breedDateFrom, dateTo: breedDateTo }),
      [calves, breedFilterSeller, breedDateFrom, breedDateTo]
    )

    const filteredSellerCalves = useMemo(
      () => applyCalfFilters(calves, { search: "", breed: sellerFilterBreed, seller: "", dateFrom: sellerDateFrom, dateTo: sellerDateTo }),
      [calves, sellerFilterBreed, sellerDateFrom, sellerDateTo]
    )

    const tableRows = useMemo(() => (
      visibleMainCalves.map((calf) => ({
        id: calf.id,
        visualTag: calf.primaryID || calf.visualTag || "-",
        eid: calf.EID || calf.eid || "-",
        backTag: calf.backTag || calf.originalID || "-",
        dateIn: formatDateCell(calf.dateIn || calf.placedDate),
        daysOnFeed: calculateDaysOnFeed(calf),
        breed: calf.breed
          ? calf.breed.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
          : "-",
        sex: calf.sex
          ? calf.sex.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
          : "-",
        purchasePrice: formatMoneyCell(calf.purchasePrice ?? calf.price)
      }))
    ), [visibleMainCalves])

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
        const breedMatch = !manageBreed || calf.breed === manageBreed
        const sellerMatch = !manageSeller || calf.seller === manageSeller

        const rawDate = getCalfDate(calf)
        const calfDate = rawDate ? new Date(rawDate) : null
        const fromLimit = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
        const toLimit = dateTo ? new Date(`${dateTo}T23:59:59`) : null

        if (fromLimit && (!calfDate || calfDate < fromLimit)) return false
        if (toLimit && (!calfDate || calfDate > toLimit)) return false
        return searchModeMatch && breedMatch && sellerMatch
      })
    }, [calves, manageSearchMode, tagSearch, bulkTagSearch, manageBreed, manageSeller, dateFrom, dateTo])
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
          status: (row) => row.status,
        }
      ),
      [filteredManageCalves, manageSort]
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
      const rawStatus = String(calf?.status || "").trim().toLowerCase()
      const isDead = Boolean(calf?.deathDate) || rawStatus === "dead" || rawStatus === "deceased"
      const isFeeding = rawStatus === "feeding" && !isDead

      if (isDead) {
        return <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Dead</span>
      }

      if (isFeeding) {
        return <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Feeding</span>
      }

      return calf?.status || "-"
    }

    useEffect(() => {
      if (!isManageMode) return
      const allowed = new Set(filteredManageCalves.map((calf) => calf.id))
      setSelectedIds((prev) => prev.filter((idValue) => allowed.has(idValue)))
    }, [isManageMode, filteredManageCalves])

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
        breed: mainBreed,
        seller: mainSeller,
        dateFrom: mainDateFrom,
        dateTo: mainDateTo,
      })

      const exportRows = exportSource.map((calf) => ({
        "Visual Tag": calf.primaryID || calf.visualTag || "",
        EID: calf.EID || calf.eid || "",
        "Back Tag": calf.backTag || calf.originalID || "",
        "Date In": formatDateForExport(calf.dateIn || calf.placedDate),
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
      if (bulkField !== "sell" && (bulkValue === "" || bulkValue === null || bulkValue === undefined)) {
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

      if (bulkField === "sell") {
        fieldToUpdate = "status"
        normalizedValue = "sold"
      }

      if (fieldToUpdate === "status" || fieldToUpdate === "sex" || fieldToUpdate === "proteinTest") {
        normalizedValue = String(bulkValue).toLowerCase()
      }

      if (fieldToUpdate === "breed" || fieldToUpdate === "dairy" || fieldToUpdate === "seller" || fieldToUpdate === "shippedTo") {
        normalizedValue = String(bulkValue).trim()
      }

      setBulkLoading(true)
      setManageMessage("")

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
        if (failedCount > 0 && updatedCount === 0) {
          setManageMessage(`Bulk edit failed. Failed: ${failedCount}. Check backend logs or API error details.`)
        } else {
          setManageMessage(`Bulk edit complete. Updated: ${updatedCount}, Failed: ${failedCount}.`)
        }
      } finally {
        setBulkLoading(false)
      }
    }

    const handleDeleteCalf = async () => {
      if (!selectedCalf?.id || !token) return
      const confirmed = window.confirm(`Delete calf "${selectedCalf.visualTag || selectedCalf.id}"? This action cannot be undone.`)
      if (!confirmed) return

      try {
        await deleteCalf(selectedCalf.id, token)
        setCalves((prev) => prev.filter((calf) => calf.id !== selectedCalf.id))
        setSelectedIds((prev) => prev.filter((idValue) => idValue !== selectedCalf.id))
        closeDetailPanel()
      } catch (error) {
        console.error("Error deleting calf:", error)
      }
    }

    if (!ranch) {
      return <div>Loading ranch data...</div>
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

            <div className="grid grid-cols-1 md:grid-cols-5 xl:grid-cols-[120px_1.2fr_170px_170px_100px] gap-2 rounded-xl border border-primary-border/20 bg-primary-border/5 p-3">
              <div>
                <label className="text-xs font-semibold text-secondary">Search Type</label>
                <select
                  className="w-full h-[36px] rounded-md border border-primary-border/40 px-2.5 py-1.5 text-xs"
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
                    className="w-full h-[36px] rounded-md border border-primary-border/40 pl-8 pr-2.5 py-1.5 text-xs"
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
                </div>
              </div>
              <div className="pt-[22px]">
                <BreedSellerFilterMenu
                  className="w-full h-[36px]"
                  breed={manageBreed}
                  seller={manageSeller}
                  breedOptions={breedOptions}
                  sellerOptions={sellerOptions}
                  onChange={({ breed, seller }) => {
                    setManageBreed(breed ?? "")
                    setManageSeller(seller ?? "")
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
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setTagSearch("")
                    setBulkTagSearch("")
                    setManageBreed("")
                    setManageSeller("")
                    setDateFrom("")
                    setDateTo("")
                  }}
                  className={`w-full min-h-[40px] ${manageButtonSecondaryClass}`}
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-primary-border/20 bg-primary-border/5 p-3 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_220px] gap-2 items-end">
                <div>
                  <label className="text-xs font-semibold text-secondary">Field</label>
                  <select
                    className="w-full h-[36px] rounded-xl border border-primary-border/40 px-2.5 py-1.5 text-xs"
                    value={bulkField}
                    onChange={(e) => setBulkField(e.target.value)}
                  >
                    <option value="purchasePrice">Purchase Price</option>
                    <option value="sellPrice">Sell Price</option>
                    <option value="sell">Sell (Status)</option>
                    <option value="breed">Breed</option>
                    <option value="status">Status</option>
                    <option value="deathDate">Death Date</option>
                    <option value="dairy">Dairy</option>
                    <option value="proteinLevel">Protein Level</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary">New Value</label>
                  <input
                    type={bulkField === "deathDate" ? "date" : "text"}
                    className="w-full h-[36px] rounded-xl border border-primary-border/40 px-2.5 py-1.5 text-xs"
                    value={bulkField === "sell" ? "sold" : bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                    disabled={bulkField === "sell"}
                  />
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
                  {sortedManageCalves.map((calf) => (
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
          </div>
        )}
        {!isManageMode && (
          <>
            <div className="rounded-2xl border border-primary-border/30 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-secondary">Manage Calves</p>
                  <h2 className="mt-1 text-xl font-semibold text-primary-text">Current Ranch Manage Calves</h2>
                  <p className="mt-1 text-sm text-secondary">
                    Explore active calves, then drill down into movement history and editing.
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
              title={loadingInventory ? "Loading manage calves..." : "Manage Calves"}
              rows={tableRows}
              columns={tableColumns}
              onRowClick={handleRowClick}
              selectedRowKey={selectedCalf?.id}
              filters={
                <div className="flex flex-col xl:flex-row xl:items-stretch xl:justify-between gap-3">
                  <div className="relative xl:w-[320px]">
                    <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-secondary" />
                    <input
                      className="w-full rounded-xl border border-primary-border/40 pl-9 pr-3 py-2.5 text-sm"
                      placeholder="Search tag / EID / back tag"
                      value={mainSearch}
                      onChange={(e) => setMainSearch(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-5 xl:grid-cols-[160px_160px_130px_130px_120px] gap-3 xl:justify-end">
                    <BreedSellerFilterMenu
                      className="w-full"
                      breed={mainBreed}
                      seller={mainSeller}
                      breedOptions={breedOptions}
                      sellerOptions={sellerOptions}
                      onChange={({ breed, seller }) => {
                        setMainBreed(breed ?? "")
                        setMainSeller(seller ?? "")
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
                    <select
                      className="w-full rounded-xl border border-primary-border/40 px-3 py-2 text-xs"
                      value={mainRowLimit}
                      onChange={(e) => setMainRowLimit(Number(e.target.value))}
                    >
                      <option value={25}>Rows: 25</option>
                      <option value={50}>Rows: 50</option>
                      <option value={100}>Rows: 100</option>
                      <option value={200}>Rows: 200</option>
                    </select>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-primary-border/40 px-3 py-1.5 text-xs hover:bg-primary-border/10"
                      onClick={handleExportExcel}
                    >
                      Export Excel
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-primary-border/40 px-3 py-1.5 text-xs hover:bg-primary-border/10"
                      onClick={() => {
                        setMainSearch("")
                        setMainBreed("")
                        setMainSeller("")
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-primary-border/30 bg-white shadow-sm overflow-visible">
                <div className="px-4 py-3 border-b border-primary-border/20">
                  <h3 className="text-sm font-semibold text-primary-text">Breed Summary</h3>
                </div>
                <div className="p-3 border-b border-primary-border/20 bg-primary-border/5">
                  <div className="flex flex-wrap lg:flex-nowrap items-stretch gap-2">
                    <BreedSellerFilterMenu
                      className="w-[150px] shrink-0"
                      breed=""
                      seller={breedFilterSeller}
                      showBreed={false}
                      showSeller
                      sellerOptions={sellerOptions}
                      onChange={({ seller }) => {
                        setBreedFilterSeller(seller ?? "")
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
                        setBreedFilterSeller("")
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

              <div className="rounded-2xl border border-primary-border/30 bg-white shadow-sm overflow-visible">
                <div className="px-4 py-3 border-b border-primary-border/20">
                  <h3 className="text-sm font-semibold text-primary-text">Seller Summary</h3>
                </div>
                <div className="p-3 border-b border-primary-border/20 bg-primary-border/5">
                  <div className="flex flex-wrap lg:flex-nowrap items-stretch gap-2">
                    <BreedSellerFilterMenu
                      className="w-[150px] shrink-0"
                      breed={sellerFilterBreed}
                      seller=""
                      showBreed
                      showSeller={false}
                      breedOptions={breedOptions}
                      onChange={({ breed }) => {
                        setSellerFilterBreed(breed ?? "")
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
                        setSellerFilterBreed("")
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
