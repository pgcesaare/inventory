import React, { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Download, Search, Trash2, X } from "lucide-react"
import { useAuth0 } from "@auth0/auth0-react"
import { useParams } from "react-router-dom"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"

import { useToken } from "../api/useToken"
import { getRanchById } from "../api/ranches"
import { createCalf, getManageCalvesByRanch } from "../api/calves"
import { getBreeds } from "../api/breeds"
import { getSellers } from "../api/sellers"
import { useAppContext } from "../context"
import DragAndDrop from "../components/add-calves/dragAndDrop"
import MainDataTable from "../components/shared/mainDataTable"
import SummaryCards from "../components/shared/summaryCards"
import SearchOptionsMenu from "../components/shared/searchOptionsMenu"
import BreedSellerFilterMenu from "../components/shared/breedSellerFilterMenu"
import DateFilterMenu from "../components/shared/dateFilterMenu"
import StyledDateInput from "../components/shared/styledDateInput"
import { RanchPageSkeleton } from "../components/shared/loadingSkeletons"
import { isDateInDateRange } from "../utils/dateRange"

const VALID_SEX = new Set(["bull", "heifer", "steer", "freeMartin"])

const SEX_OPTIONS = [
  { value: "bull", label: "Bull" },
  { value: "heifer", label: "Heifer" },
  { value: "steer", label: "Steer" },
  { value: "freeMartin", label: "Free Martin" },
]

const HEADER_MAP = {
  visualtag: "primaryID",
  ranchtag: "primaryID",
  primaryid: "primaryID",
  eid: "EID",
  eidoptional: "EID",
  backtag: "backTag",
  backtagoptional: "backTag",
  datein: "dateIn",
  breed: "breed",
  sex: "sex",
  gender: "sex",
  weight: "weight",
  weightoptional: "weight",
  purchaseprice: "purchasePrice",
  purchasepriceoptional: "purchasePrice",
  sellprice: "sellPrice",
  sellpriceoptional: "sellPrice",
  seller: "seller",
  dairy: "dairy",
  dairyoptional: "dairy",
  status: "status",
  statusoptional: "status",
  proteinlevel: "proteinLevel",
  proteinleveloptional: "proteinLevel",
  proteintest: "proteinTest",
  proteintestoptional: "proteinTest",
  deathdate: "deathDate",
  deathdateoptional: "deathDate",
  shippedoutdate: "shippedOutDate",
  shippedoutdateoptional: "shippedOutDate",
  shippedto: "shippedTo",
  shippedtooptional: "shippedTo",
  condition: "condition",
  conditionoptional: "condition",
  dayesonfeed: "preDaysOnFeed",
  daysonfeed: "preDaysOnFeed",
  daysonfeedoptional: "preDaysOnFeed",
  predaysonfeed: "preDaysOnFeed",
  predaysonfeedoptional: "preDaysOnFeed",
}

const toKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

const cleanText = (value) => String(value ?? "").trim()
const toTitleCase = (value) => cleanText(value).toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())

const normalizeSex = (value) => {
  const raw =
    value && typeof value === "object"
      ? (value.text || value.w || value.v || value.result || "")
      : value

  const normalized = cleanText(raw)
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const collapsed = normalized.replace(/\s+/g, "")
  if (!collapsed) return ""

  if (collapsed === "freemartin") return "freeMartin"
  if (collapsed === "bull") return "bull"
  if (collapsed === "heifer") return "heifer"
  if (collapsed === "steer") return "steer"

  // Extra aliases seen in imported files
  if (collapsed === "free") return "freeMartin"
  if (collapsed === "fm") return "freeMartin"
  if (collapsed === "b") return "bull"
  if (collapsed === "h") return "heifer"
  if (collapsed === "s") return "steer"
  if (collapsed === "f" || collapsed === "fr") return "freeMartin"

  return ""
}

const normalizeStatus = (value) => {
  const normalized = cleanText(value)
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!normalized) return ""

  if (normalized === "dead") return "deceased"
  if (normalized === "deceased") return "deceased"
  if (normalized === "feeding") return "feeding"
  if (normalized === "alive") return "alive"
  if (normalized === "sold") return "sold"
  if (normalized === "shipped" || normalized === "shipped out") return "shipped"

  return ""
}

const coerceNumeric = (value) => {
  if (value === null || value === undefined || value === "") return undefined
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (typeof value === "boolean") return undefined

  let text = String(value).trim()
  if (!text) return undefined

  // Excel/CSV often includes a leading apostrophe to force text.
  text = text.replace(/^'+/, "")
  // Drop whitespace and common unit/currency noise but keep separators/sign.
  text = text.replace(/\s+/g, "")
  text = text.replace(/[$€£%]|lb?s?|kg/gi, "")

  // Handle negative values represented as (123.45)
  let isNegative = false
  const negativeParenMatch = text.match(/^\((.*)\)$/)
  if (negativeParenMatch) {
    isNegative = true
    text = negativeParenMatch[1]
  }

  const lastComma = text.lastIndexOf(",")
  const lastDot = text.lastIndexOf(".")

  if (lastComma >= 0 && lastDot >= 0) {
    // Use whichever separator appears last as decimal separator.
    if (lastComma > lastDot) {
      text = text.replace(/\./g, "").replace(",", ".")
    } else {
      text = text.replace(/,/g, "")
    }
  } else if (lastComma >= 0) {
    const commaAsDecimal = /,\d{1,4}$/.test(text)
    text = commaAsDecimal ? text.replace(",", ".") : text.replace(/,/g, "")
  }

  // Keep only numeric characters, decimal point, and minus sign.
  text = text.replace(/[^0-9.-]/g, "")
  if (!text || text === "-" || text === "." || text === "-.") return undefined

  let parsed = Number(text)
  if (!Number.isFinite(parsed)) return undefined
  if (isNegative) parsed = -Math.abs(parsed)
  return parsed
}

const parseNumber = (value) => coerceNumeric(value)

const parseInteger = (value) => {
  const parsed = coerceNumeric(value)
  if (!Number.isFinite(parsed)) return undefined
  return Math.trunc(parsed)
}

const normalizeDate = (value) => {
  if (value === null || value === undefined || value === "") return undefined
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return undefined
    const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
    return date.toISOString().slice(0, 10)
  }
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString().slice(0, 10)
}

const mapRawRow = (row) => {
  const mapped = {}
  Object.keys(row || {}).forEach((key) => {
    const normalizedKey = HEADER_MAP[toKey(key)] || key
    mapped[normalizedKey] = row[key]
  })
  return mapped
}

const buildTemplateFile = () => {
  const headers = [
    "Visual Tag",
    "EID (OPTIONAL)",
    "Back Tag (OPTIONAL)",
    "Date In",
    "Breed",
    "Sex",
    "Weight (OPTIONAL)",
    "Purchase Price (OPTIONAL)",
    "Sell Price (OPTIONAL)",
    "Seller",
    "Dairy (OPTIONAL)",
    "Status (OPTIONAL)",
    "Protein Level (OPTIONAL)",
    "Protein Test (OPTIONAL)",
    "Death Date (OPTIONAL)",
    "Shipped Out Date (OPTIONAL)",
    "Shipped To (OPTIONAL)",
    "Condition (OPTIONAL)",
    "Pre Days On Feed (OPTIONAL)",
  ]

  const sampleRow = [
    "TAG-001",
    "982000000000001",
    "B-001",
    "2026-01-20",
    "holstein",
    "bull",
    420.5,
    1450.5,
    1780,
    "Acme Farms",
    "Sunny Dairy",
    "feeding",
    3.2,
    "pending",
    "",
    "",
    "",
    "",
    0,
  ]

  const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Calves")
  const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" })
  saveAs(
    new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    "calves-bulk-template.xlsx"
  )
}

const fieldClass = "w-full rounded-md border border-primary-border/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-border"
const RequiredMark = () => <span className="ml-0.5 text-red-600">*</span>
const clearButtonClass = "absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-secondary hover:bg-primary-border/10"
const clearableInputClass = `${fieldClass} pr-9`
const bulkBtnBase = "inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
const bulkBtnPrimary = `${bulkBtnBase} border border-action-blue/80 bg-action-blue text-white hover:bg-action-blue/90`
const bulkBtnSuccess = `${bulkBtnBase} border border-emerald-700/70 bg-emerald-600 text-white hover:bg-emerald-700`
const bulkBtnSecondary = `${bulkBtnBase} border border-primary-border/40 bg-surface text-primary-text hover:bg-primary-border/10`
const bulkBtnDanger = `${bulkBtnBase} border border-red-700/60 bg-red-600 text-white hover:bg-red-700`
const SINGLE_FORM_INITIAL = {
  primaryID: "",
  EID: "",
  backTag: "",
  dateIn: "",
  breed: "",
  sex: "bull",
  weight: "",
  purchasePrice: "",
  seller: "",
  dairy: "",
  proteinLevel: "",
  proteinTest: "pending",
  preDaysOnFeed: "0",
}

const AddCalves = () => {
  const { id } = useParams()
  const token = useToken()
  const { user } = useAuth0()
  const createdByName =
    user?.name ||
    [user?.given_name, user?.family_name].filter(Boolean).join(" ").trim() ||
    user?.nickname ||
    null
  const { ranch, setRanch, showSuccess, showError, confirmAction } = useAppContext()

  const [mode, setMode] = useState("bulk")

  const [file, setFile] = useState(null)
  const [validRows, setValidRows] = useState([])
  const [invalidRows, setInvalidRows] = useState([])
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState({ created: 0, failed: 0, errors: [] })
  const [duplicateAlerts, setDuplicateAlerts] = useState([])
  const [bulkStep, setBulkStep] = useState("upload")
  const [hasValidatedFile, setHasValidatedFile] = useState(false)
  const [selectedBulkRowNumbers, setSelectedBulkRowNumbers] = useState([])
  const [lastDeletedRows, setLastDeletedRows] = useState([])
  const [uploadReportRows, setUploadReportRows] = useState([])
  const [previewSearch, setPreviewSearch] = useState("")
  const [previewSearchMode, setPreviewSearchMode] = useState("single")
  const [previewSearchMatch, setPreviewSearchMatch] = useState("contains")
  const [previewSearchField, setPreviewSearchField] = useState("all")
  const [previewBreed, setPreviewBreed] = useState([])
  const [previewSeller, setPreviewSeller] = useState([])
  const [previewStatus, setPreviewStatus] = useState("")
  const [previewDateFrom, setPreviewDateFrom] = useState("")
  const [previewDateTo, setPreviewDateTo] = useState("")
  const [previewRowLimit, setPreviewRowLimit] = useState(15)
  const [catalogBreedOptions, setCatalogBreedOptions] = useState([])
  const [catalogSellerOptions, setCatalogSellerOptions] = useState([])

  const [singleForm, setSingleForm] = useState(SINGLE_FORM_INITIAL)
  const [singleLoading, setSingleLoading] = useState(false)
  const [singleMessage, setSingleMessage] = useState("")
  const [singleMessageTone, setSingleMessageTone] = useState("idle")
  const [singleErrors, setSingleErrors] = useState({})
  const [singleBreedMenuOpen, setSingleBreedMenuOpen] = useState(false)
  const [singleBreedSearch, setSingleBreedSearch] = useState("")
  const [singleSellerMenuOpen, setSingleSellerMenuOpen] = useState(false)
  const [singleSellerSearch, setSingleSellerSearch] = useState("")
  const existingIdentifierRef = useRef({ tag: new Set(), eid: new Set(), backTag: new Set() })
  const validatedRowsRef = useRef(null)
  const duplicateAlertsRef = useRef(null)
  const singleBreedMenuRef = useRef(null)
  const singleSellerMenuRef = useRef(null)
  const [shouldScrollToValidated, setShouldScrollToValidated] = useState(false)

  useEffect(() => {
    if (!token || !id || ranch?.id === Number(id)) return

    const fetchRanch = async () => {
      try {
        const data = await getRanchById(id, token)
        setRanch(data)
      } catch (err) {
        console.error("Error loading ranch:", err)
      }
    }

    fetchRanch()
  }, [id, token, ranch, setRanch])

  useEffect(() => {
    if (!token || !id) return
    const fetchExistingIdentifiers = async () => {
      try {
        const data = await getManageCalvesByRanch(id, token)
        const safeData = Array.isArray(data) ? data : []
        const normalizeId = (value) => String(value || "").toLowerCase().trim().replace(/[\s-]+/g, "")
        const tag = new Set()
        const eid = new Set()
        const backTag = new Set()
        safeData.forEach((calf) => {
          const tagKey = normalizeId(calf.primaryID || calf.visualTag)
          const eidKey = normalizeId(calf.EID || calf.eid)
          const backTagKey = normalizeId(calf.backTag || calf.originalID)
          if (tagKey) tag.add(tagKey)
          if (eidKey) eid.add(eidKey)
          if (backTagKey) backTag.add(backTagKey)
        })
        existingIdentifierRef.current = { tag, eid, backTag }
      } catch (error) {
        console.error("Error fetching existing calf identifiers:", error)
      }
    }

    fetchExistingIdentifiers()
  }, [token, id])

  useEffect(() => {
    if (!token) return

    const fetchBreeds = async () => {
      try {
        const data = await getBreeds(token)
        const options = Array.isArray(data)
          ? data
            .map((item) => cleanText(item?.name))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b))
          : []
        setCatalogBreedOptions(options)
      } catch (error) {
        console.error("Error loading breeds catalog:", error)
      }
    }

    fetchBreeds()
  }, [token])

  useEffect(() => {
    if (!token) return

    const fetchSellers = async () => {
      try {
        const data = await getSellers(token)
        const options = Array.isArray(data)
          ? data
            .map((item) => cleanText(item?.name))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b))
          : []
        setCatalogSellerOptions(options)
      } catch (error) {
        console.error("Error loading sellers catalog:", error)
      }
    }

    fetchSellers()
  }, [token])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (singleBreedMenuRef.current && !singleBreedMenuRef.current.contains(event.target)) {
        setSingleBreedMenuOpen(false)
      }
      if (singleSellerMenuRef.current && !singleSellerMenuRef.current.contains(event.target)) {
        setSingleSellerMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const summaryItems = useMemo(
    () => {
      if (mode === "bulk") {
        return [
          { label: "Rows In File", value: validRows.length + invalidRows.length },
          { label: "Valid Rows", value: validRows.length },
          { label: "Invalid Rows", value: invalidRows.length },
          { label: "Created", value: result.created },
        ]
      }

      if (mode === "single") {
        return [
          { label: "Mode", value: "One by one" },
          { label: "Last Status", value: singleMessage ? (singleMessageTone === "success" ? "Success" : "Error") : "Pending" },
          { label: "Ready", value: singleForm.primaryID && singleForm.dateIn && singleForm.breed && singleForm.sex && singleForm.seller ? "Yes" : "No" },
          { label: "Created", value: singleMessageTone === "success" ? 1 : 0 },
        ]
      }
      return []
    },
    [
      mode,
      validRows.length,
      invalidRows.length,
      result.created,
      singleMessage,
      singleMessageTone,
      singleForm.primaryID,
      singleForm.dateIn,
      singleForm.breed,
      singleForm.sex,
      singleForm.seller,
    ]
  )

  const previewRows = useMemo(
    () => validRows.map((row) => ({
      id: row.rowNumber,
      rowNumber: row.rowNumber,
      primaryID: row.payload.primaryID || "-",
      EID: row.payload.EID || "-",
      backTag: row.payload.backTag || "-",
      dateIn: row.payload.dateIn || "-",
      breed: row.payload.breed ? toTitleCase(row.payload.breed) : "-",
      sex: row.payload.sex || "-",
      status: row.payload.status === "deceased" ? "dead" : (row.payload.status || "-"),
      weight: row.payload.weight ?? "-",
      purchasePrice: row.payload.purchasePrice ?? "-",
      seller: row.payload.seller || "-",
      dairy: row.payload.dairy || "-",
      proteinLevel: row.payload.proteinLevel ?? "-",
      proteinTest: row.payload.proteinTest || "-",
      preDaysOnFeed: row.payload.preDaysOnFeed ?? "-",
    })),
    [validRows]
  )

  const selectedBulkSet = useMemo(
    () => new Set(selectedBulkRowNumbers),
    [selectedBulkRowNumbers]
  )
  const allValidRowsSelected = useMemo(
    () => validRows.length > 0 && validRows.every((row) => selectedBulkSet.has(row.rowNumber)),
    [validRows, selectedBulkSet]
  )

  const previewColumns = useMemo(() => ([
    { key: "select", label: "Select", sortable: false },
    { key: "primaryID", label: "Visual Tag" },
    { key: "EID", label: "EID" },
    { key: "backTag", label: "Back Tag" },
    { key: "dateIn", label: "Date In" },
    { key: "breed", label: "Breed" },
    { key: "sex", label: "Sex" },
    { key: "weight", label: "Weight" },
    { key: "purchasePrice", label: "Purchase Price" },
    { key: "seller", label: "Seller" },
    { key: "dairy", label: "Dairy" },
    { key: "status", label: "Status" },
  ]), [])

  const previewBreedOptions = useMemo(
    () => [...new Set(previewRows.map((row) => row.breed).filter((value) => value && value !== "-"))],
    [previewRows]
  )
  const visibleSingleBreedOptions = useMemo(
    () => catalogBreedOptions.filter((option) => String(option).toLowerCase().includes(singleBreedSearch.toLowerCase())),
    [catalogBreedOptions, singleBreedSearch]
  )
  const visibleSingleSellerOptions = useMemo(
    () => catalogSellerOptions.filter((option) => String(option).toLowerCase().includes(singleSellerSearch.toLowerCase())),
    [catalogSellerOptions, singleSellerSearch]
  )
  const previewSellerOptions = useMemo(
    () => [...new Set(previewRows.map((row) => row.seller).filter((value) => value && value !== "-"))],
    [previewRows]
  )
  const previewStatusOptions = useMemo(
    () => [...new Set(previewRows.map((row) => row.status).filter((value) => value && value !== "-"))],
    [previewRows]
  )
const normalizeSearchValue = (value) => String(value ?? "").toLowerCase().trim().replace(/[\s-]+/g, "")
const getSearchPlaceholder = (mode, field) => {
  const byField = {
    visualTag: mode === "multiple" ? "TAG-001, TAG-002, TAG-003" : "Search visual tag",
    eid: mode === "multiple" ? "982000001, 982000002, 982000003" : "Search EID",
    backTag: mode === "multiple" ? "B-001, B-002, B-003" : "Search back tag",
    all: mode === "multiple" ? "TAG-001, TAG-002, TAG-003" : "Search tag / EID / back tag",
  }
  return byField[field] || byField.all
}
  const filteredPreviewRows = useMemo(() => {
    return previewRows.filter((row) => {
      const searchValue = normalizeSearchValue(previewSearch)
      const searchTokens = String(previewSearch || "")
        .split(/[,\n]+/)
        .map((value) => normalizeSearchValue(value))
        .filter(Boolean)
      const searchableValuesByField = {
        visualTag: [row.primaryID],
        eid: [row.EID],
        backTag: [row.backTag],
      }
      const searchableValues = (
        previewSearchField === "all"
          ? [row.primaryID, row.EID, row.backTag]
          : (searchableValuesByField[previewSearchField] || [])
      ).map((value) => normalizeSearchValue(value)).filter(Boolean)

      const matches = (candidateValue) => (
        previewSearchMatch === "exact"
          ? searchableValues.some((value) => value === candidateValue)
          : searchableValues.some((value) => value.includes(candidateValue))
      )
      const searchMatch = !searchValue
        ? true
        : previewSearchMode === "multiple"
          ? searchTokens.length === 0 || searchTokens.some((token) => matches(token))
          : matches(searchValue)

      const breedMatch = previewBreed.length === 0 || previewBreed.includes(row.breed)
      const sellerMatch = previewSeller.length === 0 || previewSeller.includes(row.seller)
      const statusMatch = !previewStatus || row.status === previewStatus

      const rowDate = row.dateIn && row.dateIn !== "-" ? row.dateIn : ""
      const dateRangeMatch = isDateInDateRange(rowDate, previewDateFrom, previewDateTo)

      return searchMatch && breedMatch && sellerMatch && statusMatch && dateRangeMatch
    })
  }, [
    previewRows,
    previewSearch,
    previewSearchMode,
    previewSearchMatch,
    previewSearchField,
    previewBreed,
    previewSeller,
    previewStatus,
    previewDateFrom,
    previewDateTo,
  ])

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile)
    setHasValidatedFile(false)
    setResult({ created: 0, failed: 0, errors: [] })
    setDuplicateAlerts([])
    setSelectedBulkRowNumbers([])
    setLastDeletedRows([])
    setUploadReportRows([])
    setBulkStep("upload")
  }

  const clearFile = () => {
    setFile(null)
    setHasValidatedFile(false)
    setValidRows([])
    setInvalidRows([])
    setResult({ created: 0, failed: 0, errors: [] })
    setDuplicateAlerts([])
    setSelectedBulkRowNumbers([])
    setLastDeletedRows([])
    setUploadReportRows([])
    setBulkStep("upload")
  }

  const parseExcel = async () => {
    if (!file || !id) return
    setIsParsing(true)
    setHasValidatedFile(false)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rawRows = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: true,
      })

      const nextValidRows = []
      const nextInvalidRows = []
      const nextDuplicateAlerts = []
      const ranchId = Number(id)
      const seenInFile = { tag: new Set(), eid: new Set(), backTag: new Set() }
      const normalizeIdentifier = (value) => String(value || "").toLowerCase().trim().replace(/[\s-]+/g, "")

      rawRows.forEach((rawRow, index) => {
        const rowNumber = index + 2
        const row = mapRawRow(rawRow)
        const errors = []

        const payload = {
          primaryID: cleanText(row.primaryID),
          EID: cleanText(row.EID),
          backTag: cleanText(row.backTag),
          dateIn: normalizeDate(row.dateIn),
          breed: toTitleCase(row.breed),
          sex: normalizeSex(row.sex),
          weight: parseNumber(row.weight),
          purchasePrice: parseNumber(row.purchasePrice),
          sellPrice: parseNumber(row.sellPrice),
          seller: cleanText(row.seller),
          dairy: cleanText(row.dairy),
          deathDate: normalizeDate(row.deathDate),
          shippedOutDate: normalizeDate(row.shippedOutDate),
          shippedTo: cleanText(row.shippedTo),
          condition: cleanText(row.condition),
          // Ranch IDs from Excel are ignored; both are always set by current route ranch.
          currentRanchID: ranchId,
          originRanchID: ranchId,
          status: normalizeStatus(row.status) || "feeding",
          proteinLevel: parseNumber(row.proteinLevel),
          proteinTest: cleanText(row.proteinTest).toLowerCase() || "pending",
          preDaysOnFeed: parseInteger(row.preDaysOnFeed) ?? 0,
        }

        if (!payload.primaryID) errors.push("Visual Tag/primaryID is required")
        if (!payload.dateIn) errors.push("Date In is required")
        if (!payload.breed) errors.push("Breed is required")
        if (!cleanText(row.sex)) {
          errors.push("Sex is required")
        } else if (!payload.sex) {
          errors.push(`Sex value "${cleanText(row.sex)}" is invalid. Use bull, heifer, steer, or free martin`)
        }
        if (!payload.seller) errors.push("Seller is required")
        if (!payload.currentRanchID) errors.push("currentRanchID is required")
        if (cleanText(row.status) && !normalizeStatus(row.status)) {
          errors.push(`Status value "${cleanText(row.status)}" is invalid. Use feeding, alive, sold, shipped, or dead/deceased`)
        }

        const tagKey = normalizeIdentifier(payload.primaryID)
        const eidKey = normalizeIdentifier(payload.EID)
        const backTagKey = normalizeIdentifier(payload.backTag)

        if (tagKey) {
          if (existingIdentifierRef.current.tag.has(tagKey)) {
            nextDuplicateAlerts.push({ rowNumber, message: `Visual Tag "${payload.primaryID}" already exists in this ranch` })
          } else if (seenInFile.tag.has(tagKey)) {
            nextDuplicateAlerts.push({ rowNumber, message: `Visual Tag "${payload.primaryID}" is duplicated in this file` })
          } else {
            seenInFile.tag.add(tagKey)
          }
        }
        if (eidKey) {
          if (existingIdentifierRef.current.eid.has(eidKey)) {
            nextDuplicateAlerts.push({ rowNumber, message: `EID "${payload.EID}" already exists in this ranch` })
          } else if (seenInFile.eid.has(eidKey)) {
            nextDuplicateAlerts.push({ rowNumber, message: `EID "${payload.EID}" is duplicated in this file` })
          } else {
            seenInFile.eid.add(eidKey)
          }
        }
        if (backTagKey) {
          if (existingIdentifierRef.current.backTag.has(backTagKey)) {
            nextDuplicateAlerts.push({ rowNumber, message: `Back Tag "${payload.backTag}" already exists in this ranch` })
          } else if (seenInFile.backTag.has(backTagKey)) {
            nextDuplicateAlerts.push({ rowNumber, message: `Back Tag "${payload.backTag}" is duplicated in this file` })
          } else {
            seenInFile.backTag.add(backTagKey)
          }
        }

        if (errors.length > 0) {
          nextInvalidRows.push({ rowNumber, errors, rawRow })
          return
        }

        nextValidRows.push({ rowNumber, payload })
      })

      setValidRows(nextValidRows)
      setInvalidRows(nextInvalidRows)
      setDuplicateAlerts(nextDuplicateAlerts)
      setSelectedBulkRowNumbers([])
      setBulkStep("validate")
      setHasValidatedFile(true)
    } catch (error) {
      console.error("Error parsing file:", error)
      setValidRows([])
      setInvalidRows([{ rowNumber: "-", errors: ["Could not parse file"], rawRow: {} }])
      setDuplicateAlerts([])
      setSelectedBulkRowNumbers([])
      setBulkStep("upload")
      setHasValidatedFile(true)
    } finally {
      setIsParsing(false)
    }
  }

  const handleValidateFile = async () => {
    setShouldScrollToValidated(true)
    await parseExcel()
  }

  useEffect(() => {
    if (!shouldScrollToValidated || isParsing || mode !== "bulk") return
    const timer = setTimeout(() => {
      if (duplicateAlerts.length > 0) {
        duplicateAlertsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      } else {
        validatedRowsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }
      setShouldScrollToValidated(false)
    }, 80)
    return () => clearTimeout(timer)
  }, [shouldScrollToValidated, isParsing, mode, validRows.length, invalidRows.length, duplicateAlerts.length])

  const handleCreateBulk = async () => {
    if (!token || validRows.length === 0 || isSubmitting) return
    const confirmed = await confirmAction({
      title: "Create Calves",
      message: `Create ${validRows.length} calves from validated rows?`,
      confirmText: "YES",
      cancelText: "NO",
    })
    if (!confirmed) {
      setBulkStep("validate")
      return
    }
    setBulkStep("create")
    setIsSubmitting(true)

    let created = 0
    let failed = 0
    const errors = []
    const reportRows = []

    for (const row of validRows) {
      try {
        await createCalf({ ...row.payload, createdBy: createdByName }, token)
        created += 1
        reportRows.push({
          rowNumber: row.rowNumber,
          visualTag: row.payload.primaryID,
          eid: row.payload.EID || "",
          result: "created",
          message: "",
        })
      } catch (error) {
        failed += 1
        const message = error?.response?.data?.message || error?.message || "Unknown error"
        errors.push({
          rowNumber: row.rowNumber,
          message,
        })
        reportRows.push({
          rowNumber: row.rowNumber,
          visualTag: row.payload.primaryID,
          eid: row.payload.EID || "",
          result: "failed",
          message,
        })
      }
    }

    setUploadReportRows(reportRows)
    setResult({ created, failed, errors })
    if (created > 0) {
      showSuccess(`Bulk upload finished. Created: ${created}, Failed: ${failed}.`, "Upload Complete")
    } else if (failed > 0) {
      showError(`Bulk upload failed. Failed: ${failed}.`)
    }
    setIsSubmitting(false)
    setBulkStep("create")
  }

  const toggleBulkRowSelection = (rowNumber) => {
    setSelectedBulkRowNumbers((prev) => (
      prev.includes(rowNumber)
        ? prev.filter((value) => value !== rowNumber)
        : [...prev, rowNumber]
    ))
  }

  const toggleSelectAllValidRows = () => {
    setSelectedBulkRowNumbers((prev) => (
      prev.length === validRows.length
        ? []
        : validRows.map((row) => row.rowNumber)
    ))
  }

  const handleDeleteSelectedRows = async () => {
    if (selectedBulkRowNumbers.length === 0) return
    const confirmed = await confirmAction({
      title: "Remove Rows",
      message: `Remove ${selectedBulkRowNumbers.length} selected rows from this upload?`,
      confirmText: "YES",
      cancelText: "NO",
    })
    if (!confirmed) return
    const selectedSet = new Set(selectedBulkRowNumbers)
    const removed = validRows.filter((row) => selectedSet.has(row.rowNumber))
    setValidRows((prev) => prev.filter((row) => !selectedSet.has(row.rowNumber)))
    setLastDeletedRows(removed)
    setSelectedBulkRowNumbers([])
  }

  const handleRemoveDuplicateRows = async () => {
    if (duplicateAlerts.length === 0) return
    const normalizeIdentifier = (value) => String(value || "").toLowerCase().trim().replace(/[\s-]+/g, "")
    const countByTag = new Map()
    const countByEid = new Map()
    const countByBackTag = new Map()

    validRows.forEach((row) => {
      const payload = row?.payload || {}
      const tagKey = normalizeIdentifier(payload.primaryID)
      const eidKey = normalizeIdentifier(payload.EID)
      const backTagKey = normalizeIdentifier(payload.backTag)
      if (tagKey) countByTag.set(tagKey, (countByTag.get(tagKey) || 0) + 1)
      if (eidKey) countByEid.set(eidKey, (countByEid.get(eidKey) || 0) + 1)
      if (backTagKey) countByBackTag.set(backTagKey, (countByBackTag.get(backTagKey) || 0) + 1)
    })

    const duplicatedTagKeys = new Set([...countByTag.entries()].filter(([, count]) => count > 1).map(([key]) => key))
    const duplicatedEidKeys = new Set([...countByEid.entries()].filter(([, count]) => count > 1).map(([key]) => key))
    const duplicatedBackTagKeys = new Set([...countByBackTag.entries()].filter(([, count]) => count > 1).map(([key]) => key))

    const duplicateAlertRows = new Set(
      duplicateAlerts
        .map((item) => Number(item.rowNumber))
        .filter(Number.isFinite)
    )

    const duplicateRowNumbers = validRows
      .filter((row) => {
        const payload = row?.payload || {}
        const tagKey = normalizeIdentifier(payload.primaryID)
        const eidKey = normalizeIdentifier(payload.EID)
        const backTagKey = normalizeIdentifier(payload.backTag)
        const inFileDuplicate =
          (tagKey && duplicatedTagKeys.has(tagKey)) ||
          (eidKey && duplicatedEidKeys.has(eidKey)) ||
          (backTagKey && duplicatedBackTagKeys.has(backTagKey))
        return inFileDuplicate || duplicateAlertRows.has(Number(row.rowNumber))
      })
      .map((row) => Number(row.rowNumber))

    if (duplicateRowNumbers.length === 0) return
    const duplicateSet = new Set(duplicateRowNumbers)

    const confirmed = await confirmAction({
      title: "Remove Duplicates",
      message: `Remove ${duplicateSet.size} duplicate rows from this upload?`,
      confirmText: "YES",
      cancelText: "NO",
    })
    if (!confirmed) return

    const removed = validRows.filter((row) => duplicateSet.has(Number(row.rowNumber)))
    setValidRows((prev) => prev.filter((row) => !duplicateSet.has(Number(row.rowNumber))))
    setSelectedBulkRowNumbers((prev) => prev.filter((rowNumber) => !duplicateSet.has(Number(rowNumber))))
    setLastDeletedRows((prev) => [...prev, ...removed].sort((a, b) => Number(a.rowNumber) - Number(b.rowNumber)))
    setDuplicateAlerts([])
    showSuccess(`Removed ${removed.length} duplicate rows.`, "Duplicates Removed")
  }

  const undoDeleteSelectedRows = () => {
    if (lastDeletedRows.length === 0) return
    setValidRows((prev) => (
      [...prev, ...lastDeletedRows].sort((a, b) => Number(a.rowNumber) - Number(b.rowNumber))
    ))
    setLastDeletedRows([])
  }

  const applyAutoFixes = () => {
    setValidRows((prev) => prev.map((row) => {
      const next = { ...row.payload }
      next.primaryID = cleanText(next.primaryID)
      next.EID = cleanText(next.EID)
      next.backTag = cleanText(next.backTag)
      next.breed = toTitleCase(next.breed)
      next.seller = cleanText(next.seller)
      next.dairy = cleanText(next.dairy)
      next.sex = normalizeSex(next.sex) || next.sex
      next.status = normalizeStatus(next.status) || "feeding"
      return { ...row, payload: next }
    }))
    showSuccess("Auto-fix applied to valid rows.", "Auto-fix")
    setBulkStep("create")
  }

  const updateValidRowField = (rowNumber, key, value) => {
    setValidRows((prev) => prev.map((row) => {
      if (row.rowNumber !== rowNumber) return row
      const payload = { ...row.payload }
      if (key === "status") {
        payload.status = value === "dead" ? "deceased" : normalizeStatus(value) || "feeding"
      } else if (key === "sex") {
        payload.sex = normalizeSex(value) || payload.sex
      } else if (key === "dateIn") {
        payload.dateIn = normalizeDate(value) || payload.dateIn
      } else if (key === "breed") {
        payload[key] = toTitleCase(value)
      } else if (key === "seller") {
        payload[key] = cleanText(value)
      } else {
        payload[key] = value
      }
      return { ...row, payload }
    }))
  }

  const downloadUploadReport = () => {
    if (uploadReportRows.length === 0) return
    const worksheet = XLSX.utils.json_to_sheet(uploadReportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Upload Report")
    const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" })
    saveAs(
      new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `calves-upload-report-${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  }

  const downloadDuplicateAlerts = () => {
    if (duplicateAlerts.length === 0) return
    const rows = duplicateAlerts.map((item) => {
      const message = String(item.message || "")
      let tagType = ""
      if (/visual tag/i.test(message)) tagType = "Visual Tag"
      else if (/\beid\b/i.test(message)) tagType = "EID"
      else if (/back tag/i.test(message)) tagType = "Back Tag"

      return {
        tagType,
        value: message.match(/"([^"]+)"/)?.[1] || "",
        message,
      }
    })
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Duplicate Alerts")
    const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" })
    saveAs(
      new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `duplicate-alerts-${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  }

  const handleSingleChange = (key, value) => {
    if (singleMessage) {
      setSingleMessage("")
      setSingleMessageTone("idle")
    }
    if (singleErrors[key]) {
      setSingleErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
    setSingleForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleResetSingleForm = () => {
    setSingleForm(SINGLE_FORM_INITIAL)
    setSingleErrors({})
    setSingleMessage("")
    setSingleMessageTone("idle")
    setSingleBreedMenuOpen(false)
    setSingleBreedSearch("")
    setSingleSellerMenuOpen(false)
    setSingleSellerSearch("")
  }

  const handleCreateSingle = async () => {
    if (!token || !id || singleLoading) return

    const payload = {
      primaryID: cleanText(singleForm.primaryID),
      EID: cleanText(singleForm.EID),
      backTag: cleanText(singleForm.backTag),
      dateIn: normalizeDate(singleForm.dateIn),
      breed: cleanText(singleForm.breed).toLowerCase(),
      sex: normalizeSex(singleForm.sex),
      weight: parseNumber(singleForm.weight),
      purchasePrice: parseNumber(singleForm.purchasePrice),
      seller: cleanText(singleForm.seller),
      dairy: cleanText(singleForm.dairy),
      currentRanchID: Number(id),
      originRanchID: Number(id),
      status: "feeding",
      proteinLevel: parseNumber(singleForm.proteinLevel),
      proteinTest: cleanText(singleForm.proteinTest).toLowerCase(),
      preDaysOnFeed: parseInteger(singleForm.preDaysOnFeed) ?? 0,
      createdBy: createdByName,
    }

    const nextErrors = {}
    if (!payload.primaryID) nextErrors.primaryID = "Visual Tag is required."
    if (!payload.dateIn) nextErrors.dateIn = "Date In is required."
    if (!payload.breed) nextErrors.breed = "Breed is required."
    if (!payload.sex) nextErrors.sex = "Sex is required."
    if (!payload.seller) nextErrors.seller = "Seller is required."

    if (Object.keys(nextErrors).length > 0) {
      setSingleErrors(nextErrors)
      setSingleMessage("")
      setSingleMessageTone("idle")
      return
    }

    try {
      setSingleLoading(true)
      setSingleErrors({})
      await createCalf(payload, token)
      setSingleMessage(`Calf ${payload.primaryID} created successfully.`)
      setSingleMessageTone("success")
      showSuccess(`Calf ${payload.primaryID} created successfully.`, "Created")
      setSingleForm(SINGLE_FORM_INITIAL)
    } catch (error) {
      setSingleMessage(error?.response?.data?.message || "Error creating calf.")
      setSingleMessageTone("error")
      showError(error?.response?.data?.message || "Error creating calf.")
    } finally {
      setSingleLoading(false)
    }
  }

  if (!ranch) return <RanchPageSkeleton />

  const canValidateFile = Boolean(file) && !isParsing && !isSubmitting
  const canCreateBulk = hasValidatedFile && validRows.length > 0 && !isSubmitting && !isParsing
  const bulkNextStepMessage = !file
    ? "Step 1: Upload your Excel file."
    : !hasValidatedFile
      ? "Step 2: Click Validate File to check rows before creating calves."
      : validRows.length === 0
        ? "No valid rows available. Fix errors or upload a different file."
        : "Step 3: Click Create Calves."

  return (
    <div className="w-full max-w-full min-h-screen bg-background flex justify-center overflow-x-hidden px-4 md:px-6 py-10">
      <div className="w-full max-w-7xl min-w-0 overflow-x-hidden flex flex-col gap-6">
        <div className="rounded-2xl border border-primary-border/30 bg-white shadow-sm p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-title-h3 text-primary-text">Add Calves</h2>
            <p className="text-sm text-secondary">
              Register calves for <span className="font-semibold">{ranch.name}</span> by Excel or one by one.
            </p>
          </div>

          <button
            type="button"
            onClick={buildTemplateFile}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary-border/40 bg-surface px-2.5 py-1.5 text-xs font-medium text-primary-text transition-colors duration-200 hover:bg-primary-border/10 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Download Template
          </button>
        </div>

        <div className="rounded-2xl border border-primary-border/30 bg-white p-2 flex flex-wrap gap-2">
          {[{ id: "bulk", label: "Bulk Excel" }, { id: "single", label: "One by one" }].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                mode === item.id
                  ? "border border-action-blue/80 bg-action-blue text-white"
                  : "border border-primary-border/40 text-primary-text hover:bg-primary-border/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <SummaryCards items={summaryItems} />

        {mode === "bulk" && (
          <>
            <div className="w-full min-w-0 rounded-2xl border border-primary-border/30 bg-white p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Bulk Flow</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {[
                  { key: "upload", label: "1. Upload File" },
                  { key: "validate", label: "2. Validate File" },
                  { key: "create", label: "3. Create Calves" },
                ].map((step) => (
                  <div
                    key={step.key}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold text-center transition-colors ${
                      bulkStep === step.key
                        ? "border-action-blue/70 bg-action-blue/10 text-action-blue shadow-sm"
                        : "border-primary-border/30 bg-white text-secondary"
                    }`}
                  >
                    {step.label}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-secondary">{bulkNextStepMessage}</p>
            </div>

            <DragAndDrop
              onFileSelect={handleFileSelect}
              selectedFile={file}
              disabled={isParsing || isSubmitting}
            />

            <div className="w-full min-w-0 overflow-x-hidden rounded-2xl border border-primary-border/30 bg-white p-4 shadow-sm space-y-4">
              <div className="w-full min-w-0 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleValidateFile}
                  disabled={!canValidateFile}
                  className={bulkBtnPrimary}
                >
                  {isParsing ? "Validating file..." : "Validate File"}
                </button>
                <button
                  type="button"
                  onClick={handleCreateBulk}
                  disabled={!canCreateBulk}
                  className={bulkBtnSuccess}
                >
                  {isSubmitting ? "Creating calves..." : `Create Calves (${validRows.length})`}
                </button>
                <button
                  type="button"
                  onClick={clearFile}
                  disabled={!file || isParsing || isSubmitting}
                  className={bulkBtnSecondary}
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </button>
              </div>

              <div className="h-px w-full bg-primary-border/20" />

              <div className="w-full min-w-0 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeleteSelectedRows}
                  disabled={selectedBulkRowNumbers.length === 0 || isSubmitting || isParsing}
                  className={bulkBtnDanger}
                >
                  Delete ({selectedBulkRowNumbers.length})
                </button>
                {lastDeletedRows.length > 0 && (
                  <button
                    type="button"
                    onClick={undoDeleteSelectedRows}
                    className={bulkBtnSecondary}
                  >
                    Undo delete ({lastDeletedRows.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={applyAutoFixes}
                  disabled={validRows.length === 0 || isSubmitting || isParsing}
                  className={bulkBtnSecondary}
                >
                  Auto-fix
                </button>
                {uploadReportRows.length > 0 && (
                  <button
                    type="button"
                    onClick={downloadUploadReport}
                    className={bulkBtnSecondary}
                  >
                    <Download className="h-4 w-4" />
                    Download Upload Report
                  </button>
                )}
              </div>
              <p className="text-xs text-secondary">
                Auto-fix standardizes valid rows only: trims IDs/text, normalizes breed casing, and normalizes sex/status values. It does not fix missing required fields.
              </p>
            </div>

            {invalidRows.length > 0 && (
              <div className="w-full min-w-0 overflow-x-hidden rounded-2xl border border-red-200 bg-red-50/80 p-4 break-words">
                <h3 className="text-sm font-semibold text-red-700">Validation errors</h3>
                <ul className="mt-2 space-y-1 text-xs text-red-700">
                  {invalidRows.slice(0, 15).map((item) => (
                    <li key={`invalid-${item.rowNumber}`}>
                      Row {item.rowNumber}: {item.errors.join(", ")}
                    </li>
                  ))}
                  {invalidRows.length > 15 && (
                    <li>...and {invalidRows.length - 15} more rows with errors.</li>
                  )}
                </ul>
              </div>
            )}

            {duplicateAlerts.length > 0 && (
              <div ref={duplicateAlertsRef} className="w-full min-w-0 overflow-x-hidden rounded-2xl border border-red-200 bg-red-50/80 p-4 break-words">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-red-700">Duplicate alerts</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={downloadDuplicateAlerts}
                      disabled={isParsing || isSubmitting || duplicateAlerts.length === 0}
                      className={bulkBtnSecondary}
                    >
                      <Download className="h-4 w-4" />
                      Export duplicates
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveDuplicateRows}
                      disabled={isParsing || isSubmitting}
                      className={bulkBtnDanger}
                    >
                      Remove duplicate rows
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-red-700">Duplicates are allowed and will still be uploaded.</p>
                <ul className="mt-2 space-y-1 text-xs text-red-700">
                  {duplicateAlerts.slice(0, 15).map((item, idx) => (
                    <li key={`duplicate-alert-${item.rowNumber}-${idx}`}>
                      Row {item.rowNumber}: {item.message}
                    </li>
                  ))}
                  {duplicateAlerts.length > 15 && (
                    <li>...and {duplicateAlerts.length - 15} more duplicate alerts.</li>
                  )}
                </ul>
              </div>
            )}

            {result.failed > 0 && (
              <div className="w-full min-w-0 overflow-x-hidden rounded-2xl border border-yellow-200 bg-yellow-50/80 p-4 break-words">
                <h3 className="text-sm font-semibold text-yellow-700">Rows failed during creation</h3>
                <ul className="mt-2 space-y-1 text-xs text-yellow-800">
                  {result.errors.slice(0, 15).map((item) => (
                    <li key={`submit-error-${item.rowNumber}`}>
                      Row {item.rowNumber}: {item.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div ref={validatedRowsRef} className="w-full min-w-0 overflow-x-hidden">
              <MainDataTable
                title="Valid rows preview"
                rows={filteredPreviewRows}
                columns={previewColumns}
                enablePagination
                pageSize={previewRowLimit}
                clipHorizontalOverflow
                disableHorizontalScroll
                tableClassName="w-full table-fixed"
                headerCellClassName="whitespace-nowrap"
                bodyCellClassName="whitespace-normal break-words align-top"
                cellRenderers={{
                select: (row) => (
                  <input
                    type="checkbox"
                    checked={selectedBulkSet.has(row.rowNumber)}
                    onChange={() => toggleBulkRowSelection(row.rowNumber)}
                    className="h-4 w-4 cursor-pointer"
                    aria-label={`Include row ${row.rowNumber}`}
                  />
                ),
                dateIn: (row) => (
                  <StyledDateInput
                    inputClassName="h-[30px] min-w-0 rounded-md border-primary-border/30 px-2 py-1 text-xs"
                    value={row.dateIn === "-" ? "" : row.dateIn}
                    onChange={(e) => updateValidRowField(row.rowNumber, "dateIn", e.target.value)}
                    ariaLabel="Open row date picker"
                  />
                ),
                breed: (row) => (
                  <input
                    className="w-full min-w-0 rounded-md border border-primary-border/30 px-2 py-1 text-xs"
                    value={row.breed === "-" ? "" : row.breed}
                    onChange={(e) => updateValidRowField(row.rowNumber, "breed", e.target.value)}
                  />
                ),
                sex: (row) => (
                  <select
                    className="w-full min-w-0 rounded-md border border-primary-border/30 px-2 py-1 text-xs"
                    value={row.sex === "-" ? "bull" : row.sex}
                    onChange={(e) => updateValidRowField(row.rowNumber, "sex", e.target.value)}
                  >
                    {SEX_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ),
                status: (row) => (
                  <select
                    className="w-full min-w-0 rounded-md border border-primary-border/30 px-2 py-1 text-xs"
                    value={row.status === "-" ? "feeding" : row.status}
                    onChange={(e) => updateValidRowField(row.rowNumber, "status", e.target.value)}
                  >
                    <option value="feeding">Feeding</option>
                    <option value="alive">Alive</option>
                    <option value="sold">Sold</option>
                    <option value="shipped">Shipped</option>
                    <option value="dead">Dead</option>
                  </select>
                ),
                seller: (row) => (
                  <input
                    className="w-full min-w-0 rounded-md border border-primary-border/30 px-2 py-1 text-xs"
                    value={row.seller === "-" ? "" : row.seller}
                    onChange={(e) => updateValidRowField(row.rowNumber, "seller", e.target.value)}
                  />
                ),
              }}
                headerRenderers={{
                select: () => (
                  <div className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allValidRowsSelected}
                      onChange={toggleSelectAllValidRows}
                      onClick={(event) => event.stopPropagation()}
                      className="h-4 w-4 cursor-pointer"
                      aria-label="Select all rows"
                    />
                    <span>Select</span>
                  </div>
                ),
                }}
                filters={(
                  <div className="w-full min-w-0 flex flex-col gap-3">
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                    <SearchOptionsMenu
                      className="w-full"
                      searchMode={previewSearchMode}
                      searchMatch={previewSearchMatch}
                      searchField={previewSearchField}
                      fieldOptions={[
                        { value: "all", label: "All" },
                        { value: "visualTag", label: "Visual Tag" },
                        { value: "eid", label: "EID" },
                        { value: "backTag", label: "Back Tag" },
                      ]}
                      onChange={({ searchMode, searchMatch, searchField }) => {
                        setPreviewSearchMode(searchMode)
                        setPreviewSearchMatch(searchMatch)
                        setPreviewSearchField(searchField || "all")
                      }}
                    />
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-secondary" />
                      <input
                        className="h-[40px] w-full rounded-xl border border-primary-border/40 pl-9 pr-9 text-xs"
                        placeholder={getSearchPlaceholder(previewSearchMode, previewSearchField)}
                        value={previewSearch}
                        onChange={(e) => setPreviewSearch(e.target.value)}
                      />
                      {previewSearch && (
                        <button
                          type="button"
                          onClick={() => setPreviewSearch("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-secondary hover:bg-primary-border/10"
                          aria-label="Clear search"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                    {previewSearchMode === "multiple" && (
                      <p className="sm:col-span-2 text-xs text-secondary">Multiple values must be separated by comma.</p>
                    )}
                  </div>
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <BreedSellerFilterMenu
                      className="w-full"
                      breed={previewBreed}
                      seller={previewSeller}
                      status={previewStatus}
                      breedOptions={previewBreedOptions}
                      sellerOptions={previewSellerOptions}
                      statusOptions={previewStatusOptions}
                      showStatus
                      onChange={({ breed, seller, status }) => {
                        setPreviewBreed(Array.isArray(breed) ? breed : (breed ? [breed] : []))
                        setPreviewSeller(Array.isArray(seller) ? seller : (seller ? [seller] : []))
                        setPreviewStatus(status || "")
                      }}
                    />
                    <DateFilterMenu
                      className="w-full"
                      dateFrom={previewDateFrom}
                      dateTo={previewDateTo}
                      onChange={({ from, to }) => {
                        setPreviewDateFrom(from)
                        setPreviewDateTo(to)
                      }}
                    />
                    <input
                      type="number"
                      max={1000}
                      className="w-full rounded-xl border border-primary-border/40 px-3 py-2 text-xs"
                      value={previewRowLimit}
                      onChange={(e) => {
                        const rawValue = e.target.value
                        if (rawValue === "") {
                          setPreviewRowLimit("")
                          return
                        }
                        const nextValue = Number(rawValue)
                        if (!Number.isFinite(nextValue)) return
                        setPreviewRowLimit(Math.max(0, Math.min(1000, nextValue)))
                      }}
                    />
                    <button
                      type="button"
                      className="w-full rounded-xl border border-primary-border/40 px-3 py-1.5 text-xs hover:bg-primary-border/10"
                      onClick={() => {
                        setPreviewSearch("")
                        setPreviewSearchMode("single")
                        setPreviewSearchMatch("contains")
                        setPreviewSearchField("all")
                        setPreviewBreed([])
                        setPreviewSeller([])
                        setPreviewStatus("")
                        setPreviewDateFrom("")
                        setPreviewDateTo("")
                      }}
                    >
                      Reset
                    </button>
                  </div>
                  </div>
                )}
              />
            </div>
          </>
        )}

        {mode === "single" && (
          <div className="w-full min-w-0 overflow-x-hidden rounded-2xl border border-primary-border/30 bg-white shadow-sm p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-secondary">Visual Tag<RequiredMark /></label>
              <div className="relative">
                <input className={clearableInputClass} value={singleForm.primaryID} onChange={(e) => handleSingleChange("primaryID", e.target.value)} />
                {singleForm.primaryID && (
                  <button type="button" className={clearButtonClass} onClick={() => handleSingleChange("primaryID", "")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {singleErrors.primaryID && <p className="mt-1 text-xs text-red-600">{singleErrors.primaryID}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">EID</label>
              <div className="relative">
                <input className={clearableInputClass} value={singleForm.EID} onChange={(e) => handleSingleChange("EID", e.target.value)} />
                {singleForm.EID && (
                  <button type="button" className={clearButtonClass} onClick={() => handleSingleChange("EID", "")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Back Tag</label>
              <div className="relative">
                <input className={clearableInputClass} value={singleForm.backTag} onChange={(e) => handleSingleChange("backTag", e.target.value)} />
                {singleForm.backTag && (
                  <button type="button" className={clearButtonClass} onClick={() => handleSingleChange("backTag", "")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Date In<RequiredMark /></label>
              <StyledDateInput
                inputClassName={clearableInputClass}
                value={singleForm.dateIn}
                onChange={(e) => handleSingleChange("dateIn", e.target.value)}
                ariaLabel="Open single calf date picker"
              />
              {singleErrors.dateIn && <p className="mt-1 text-xs text-red-600">{singleErrors.dateIn}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Breed<RequiredMark /></label>
              <div className="relative" ref={singleBreedMenuRef}>
                <button
                  type="button"
                  disabled={catalogBreedOptions.length === 0}
                  className={`${fieldClass} flex items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-60`}
                  onClick={() => {
                    if (catalogBreedOptions.length === 0) return
                    setSingleBreedMenuOpen((prev) => !prev)
                  }}
                >
                  <span className={singleForm.breed ? "text-primary-text" : "text-secondary"}>
                    {catalogBreedOptions.length === 0 ? "No breeds avaliable" : (singleForm.breed || "Select breed")}
                  </span>
                  <ChevronDown className="h-4 w-4 text-secondary" />
                </button>

                {singleBreedMenuOpen && (
                  <div className="absolute left-0 right-0 z-30 mt-1 rounded-xl border border-primary-border/30 bg-surface p-2 shadow-lg">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary" />
                      <input
                        className="w-full rounded-lg border border-primary-border/40 py-1.5 pl-8 pr-8 text-xs"
                        placeholder="Search breed"
                        value={singleBreedSearch}
                        onChange={(e) => setSingleBreedSearch(e.target.value)}
                      />
                      {singleBreedSearch && (
                        <button
                          type="button"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-secondary hover:bg-primary-border/10"
                          onClick={() => setSingleBreedSearch("")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-primary-border/30 p-1">
                      {visibleSingleBreedOptions.length === 0 ? (
                        <p className="px-2 py-1 text-xs text-secondary">No breeds found</p>
                      ) : (
                        visibleSingleBreedOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={`w-full rounded-md px-2 py-1 text-left text-xs hover:bg-primary-border/10 ${
                              singleForm.breed === option ? "bg-primary-border/10 font-medium text-primary-text" : "text-primary-text"
                            }`}
                            onClick={() => {
                              handleSingleChange("breed", option)
                              setSingleBreedMenuOpen(false)
                              setSingleBreedSearch("")
                            }}
                          >
                            {option}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {singleErrors.breed && <p className="mt-1 text-xs text-red-600">{singleErrors.breed}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Sex<RequiredMark /></label>
              <select className={fieldClass} value={singleForm.sex} onChange={(e) => handleSingleChange("sex", e.target.value)}>
                {SEX_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {singleErrors.sex && <p className="mt-1 text-xs text-red-600">{singleErrors.sex}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Seller<RequiredMark /></label>
              <div className="relative" ref={singleSellerMenuRef}>
                <button
                  type="button"
                  disabled={catalogSellerOptions.length === 0}
                  className={`${fieldClass} flex items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-60`}
                  onClick={() => {
                    if (catalogSellerOptions.length === 0) return
                    setSingleSellerMenuOpen((prev) => !prev)
                  }}
                >
                  <span className={singleForm.seller ? "text-primary-text" : "text-secondary"}>
                    {catalogSellerOptions.length === 0 ? "No sellers avaliable" : (singleForm.seller || "Select seller")}
                  </span>
                  <ChevronDown className="h-4 w-4 text-secondary" />
                </button>

                {singleSellerMenuOpen && (
                  <div className="absolute left-0 right-0 z-30 mt-1 rounded-xl border border-primary-border/30 bg-surface p-2 shadow-lg">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary" />
                      <input
                        className="w-full rounded-lg border border-primary-border/40 py-1.5 pl-8 pr-8 text-xs"
                        placeholder="Search seller"
                        value={singleSellerSearch}
                        onChange={(e) => setSingleSellerSearch(e.target.value)}
                      />
                      {singleSellerSearch && (
                        <button
                          type="button"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-secondary hover:bg-primary-border/10"
                          onClick={() => setSingleSellerSearch("")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-primary-border/30 p-1">
                      {visibleSingleSellerOptions.length === 0 ? (
                        <p className="px-2 py-1 text-xs text-secondary">No sellers found</p>
                      ) : (
                        visibleSingleSellerOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={`w-full rounded-md px-2 py-1 text-left text-xs hover:bg-primary-border/10 ${
                              singleForm.seller === option ? "bg-primary-border/10 font-medium text-primary-text" : "text-primary-text"
                            }`}
                            onClick={() => {
                              handleSingleChange("seller", option)
                              setSingleSellerMenuOpen(false)
                              setSingleSellerSearch("")
                            }}
                          >
                            {option}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {singleErrors.seller && <p className="mt-1 text-xs text-red-600">{singleErrors.seller}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Weight</label>
              <div className="relative">
                <input className={clearableInputClass} value={singleForm.weight} onChange={(e) => handleSingleChange("weight", e.target.value)} />
                {singleForm.weight && (
                  <button type="button" className={clearButtonClass} onClick={() => handleSingleChange("weight", "")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Purchase Price</label>
              <div className="relative">
                <input className={clearableInputClass} value={singleForm.purchasePrice} onChange={(e) => handleSingleChange("purchasePrice", e.target.value)} />
                {singleForm.purchasePrice && (
                  <button type="button" className={clearButtonClass} onClick={() => handleSingleChange("purchasePrice", "")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Dairy</label>
              <div className="relative">
                <input className={clearableInputClass} value={singleForm.dairy} onChange={(e) => handleSingleChange("dairy", e.target.value)} />
                {singleForm.dairy && (
                  <button type="button" className={clearButtonClass} onClick={() => handleSingleChange("dairy", "")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Protein Level</label>
              <div className="relative">
                <input className={clearableInputClass} value={singleForm.proteinLevel} onChange={(e) => handleSingleChange("proteinLevel", e.target.value)} />
                {singleForm.proteinLevel && (
                  <button type="button" className={clearButtonClass} onClick={() => handleSingleChange("proteinLevel", "")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Protein Test</label>
              <select className={fieldClass} value={singleForm.proteinTest} onChange={(e) => handleSingleChange("proteinTest", e.target.value)}>
                <option value="pending">Pending</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Pre-Days-On-Feed</label>
              <div className="relative">
                <input className={clearableInputClass} value={singleForm.preDaysOnFeed} onChange={(e) => handleSingleChange("preDaysOnFeed", e.target.value)} />
                {singleForm.preDaysOnFeed && (
                  <button type="button" className={clearButtonClass} onClick={() => handleSingleChange("preDaysOnFeed", "")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={handleResetSingleForm}
                disabled={singleLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary-border/40 bg-surface px-2.5 py-1.5 text-xs font-medium text-primary-text hover:bg-primary-border/10 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
              >
                Erase all
              </button>
              <button
                type="button"
                onClick={handleCreateSingle}
                disabled={singleLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-action-blue/80 bg-action-blue px-2.5 py-1.5 text-xs font-medium text-white hover:bg-action-blue/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
              >
                {singleLoading ? "Creating calf..." : "Create calf"}
              </button>
              {singleMessage && (
                <p className={`text-sm ${singleMessageTone === "success" ? "text-emerald-700" : "text-red-600"}`}>
                  {singleMessage}
                </p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default AddCalves
