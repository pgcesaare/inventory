import React, { useEffect, useMemo, useState } from "react"
import { Download, Trash2, X } from "lucide-react"
import { useParams } from "react-router-dom"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"

import { useToken } from "../api/useToken"
import { getRanchById } from "../api/ranches"
import { createCalf } from "../api/calves"
import { useAppContext } from "../context"
import DragAndDrop from "../components/add-calves/dragAndDrop"
import MainDataTable from "../components/shared/mainDataTable"
import SummaryCards from "../components/shared/summaryCards"

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
  backtag: "backTag",
  datein: "dateIn",
  breed: "breed",
  sex: "sex",
  weight: "weight",
  purchaseprice: "purchasePrice",
  seller: "seller",
  dairy: "dairy",
  proteinlevel: "proteinLevel",
  proteintest: "proteinTest",
  deathdate: "deathDate",
  shippedoutdate: "shippedOutDate",
  shippedto: "shippedTo",
  dayesonfeed: "preDaysOnFeed",
  daysonfeed: "preDaysOnFeed",
  predaysonfeed: "preDaysOnFeed",
  originranchid: "originRanchID",
  currentranchid: "currentRanchID",
}

const toKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

const cleanText = (value) => String(value ?? "").trim()

const normalizeSex = (value) => {
  const normalized = cleanText(value).toLowerCase().replace(/\s+/g, "")
  if (!normalized) return ""
  if (normalized === "freemartin") return "freeMartin"
  if (normalized === "bull" || normalized === "heifer" || normalized === "steer") return normalized
  return ""
}

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const parseInteger = (value) => {
  if (value === null || value === undefined || value === "") return undefined
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
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
    "EID",
    "Back Tag",
    "Date In",
    "Breed",
    "Sex",
    "Weight",
    "Purchase Price",
    "Seller",
    "Dairy",
    "Protein Level",
    "Protein Test",
    "Pre-Days-On-Feed",
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
    "Acme Farms",
    "Sunny Dairy",
    3.1,
    "pass",
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
  const { ranch, setRanch } = useAppContext()

  const [mode, setMode] = useState("bulk")

  const [file, setFile] = useState(null)
  const [validRows, setValidRows] = useState([])
  const [invalidRows, setInvalidRows] = useState([])
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState({ created: 0, failed: 0, errors: [] })

  const [singleForm, setSingleForm] = useState(SINGLE_FORM_INITIAL)
  const [singleLoading, setSingleLoading] = useState(false)
  const [singleMessage, setSingleMessage] = useState("")
  const [singleMessageTone, setSingleMessageTone] = useState("idle")
  const [singleErrors, setSingleErrors] = useState({})

  const [groupForm, setGroupForm] = useState({
    count: "10",
    tagPrefix: "TAG-",
    backTagPrefix: "B-",
    startNumber: "1",
    padLength: "3",
    eidPrefix: "",
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
  })
  const [groupLoading, setGroupLoading] = useState(false)
  const [groupResult, setGroupResult] = useState({ created: 0, failed: 0, errors: [] })
  const [groupErrors, setGroupErrors] = useState({})

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
          { label: "Ready", value: singleForm.primaryID && singleForm.EID && singleForm.dateIn && singleForm.breed && singleForm.sex && singleForm.seller ? "Yes" : "No" },
          { label: "Created", value: singleMessageTone === "success" ? 1 : 0 },
        ]
      }

      return [
        { label: "Mode", value: "Quick group" },
        { label: "Requested", value: parseInteger(groupForm.count) || 0 },
        { label: "Created", value: groupResult.created },
        { label: "Failed", value: groupResult.failed },
      ]
    },
    [
      mode,
      validRows.length,
      invalidRows.length,
      result.created,
      singleMessage,
      singleMessageTone,
      singleForm.primaryID,
      singleForm.EID,
      singleForm.dateIn,
      singleForm.breed,
      singleForm.sex,
      singleForm.seller,
      groupForm.count,
      groupResult.created,
      groupResult.failed,
    ]
  )

  const previewRows = useMemo(
    () =>
      validRows.map((row) => ({
        visualTag: row.payload.primaryID,
        eid: row.payload.EID || "-",
        breed: row.payload.breed || "-",
        sex: row.payload.sex || "-",
      })),
    [validRows]
  )

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile)
    setResult({ created: 0, failed: 0, errors: [] })
  }

  const clearFile = () => {
    setFile(null)
    setValidRows([])
    setInvalidRows([])
    setResult({ created: 0, failed: 0, errors: [] })
  }

  const parseExcel = async () => {
    if (!file || !id) return
    setIsParsing(true)

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
      const ranchId = Number(id)

      rawRows.forEach((rawRow, index) => {
        const rowNumber = index + 2
        const row = mapRawRow(rawRow)
        const errors = []

        const payload = {
          primaryID: cleanText(row.primaryID),
          EID: cleanText(row.EID),
          backTag: cleanText(row.backTag),
          dateIn: normalizeDate(row.dateIn),
          breed: cleanText(row.breed).toLowerCase(),
          sex: normalizeSex(row.sex),
          weight: parseNumber(row.weight),
          purchasePrice: parseNumber(row.purchasePrice),
          seller: cleanText(row.seller),
          dairy: cleanText(row.dairy),
          currentRanchID: parseInteger(row.currentRanchID) || ranchId,
          originRanchID: parseInteger(row.originRanchID) || ranchId,
          status: "feeding",
          proteinLevel: parseNumber(row.proteinLevel),
          proteinTest: cleanText(row.proteinTest).toLowerCase() || "pending",
          preDaysOnFeed: parseInteger(row.preDaysOnFeed) ?? 0,
        }

        if (!payload.primaryID) errors.push("Visual Tag/primaryID is required")
        if (!payload.EID) errors.push("EID is required")
        if (!payload.dateIn) errors.push("Date In is required")
        if (!payload.breed) errors.push("Breed is required")
        if (!payload.sex) errors.push("Sex must be one of: bull, heifer, steer, freeMartin")
        if (!payload.seller) errors.push("Seller is required")
        if (!payload.currentRanchID) errors.push("currentRanchID is required")

        if (errors.length > 0) {
          nextInvalidRows.push({ rowNumber, errors, rawRow })
          return
        }

        nextValidRows.push({ rowNumber, payload })
      })

      setValidRows(nextValidRows)
      setInvalidRows(nextInvalidRows)
    } catch (error) {
      console.error("Error parsing file:", error)
      setValidRows([])
      setInvalidRows([{ rowNumber: "-", errors: ["Could not parse file"], rawRow: {} }])
    } finally {
      setIsParsing(false)
    }
  }

  const handleCreateBulk = async () => {
    if (!token || validRows.length === 0 || isSubmitting) return
    setIsSubmitting(true)

    let created = 0
    let failed = 0
    const errors = []

    for (const row of validRows) {
      try {
        await createCalf(row.payload, token)
        created += 1
      } catch (error) {
        failed += 1
        errors.push({
          rowNumber: row.rowNumber,
          message: error?.response?.data?.message || error?.message || "Unknown error",
        })
      }
    }

    setResult({ created, failed, errors })
    setIsSubmitting(false)
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
    }

    const nextErrors = {}
    if (!payload.primaryID) nextErrors.primaryID = "Visual Tag is required."
    if (!payload.EID) nextErrors.EID = "EID is required."
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
      setSingleForm(SINGLE_FORM_INITIAL)
    } catch (error) {
      setSingleMessage(error?.response?.data?.message || "Error creating calf.")
      setSingleMessageTone("error")
    } finally {
      setSingleLoading(false)
    }
  }

  const handleGroupChange = (key, value) => {
    if (groupErrors[key]) {
      setGroupErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
    setGroupForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleCreateGroup = async () => {
    if (!token || !id || groupLoading) return

    const count = parseInteger(groupForm.count)
    const startNumber = parseInteger(groupForm.startNumber) ?? 1
    const padLength = parseInteger(groupForm.padLength) ?? 3

    const nextErrors = {}
    if (!count || count < 1 || count > 1000) nextErrors.count = "Count must be between 1 and 1000."
    if (!cleanText(groupForm.tagPrefix)) nextErrors.tagPrefix = "Tag Prefix is required."
    if (!cleanText(groupForm.breed)) nextErrors.breed = "Breed is required."
    if (!cleanText(groupForm.seller)) nextErrors.seller = "Seller is required."

    const sex = normalizeSex(groupForm.sex)
    if (!sex) {
      nextErrors.sex = "Sex is invalid."
    }

    if (!cleanText(groupForm.eidPrefix)) {
      nextErrors.eidPrefix = "EID Prefix is required."
    }

    if (!normalizeDate(groupForm.dateIn)) {
      nextErrors.dateIn = "Date In is required."
    }

    if (Object.keys(nextErrors).length > 0) {
      setGroupErrors(nextErrors)
      setGroupResult({ created: 0, failed: 0, errors: [] })
      return
    }

    const rows = Array.from({ length: count }).map((_, index) => {
      const sequence = String(startNumber + index).padStart(Math.max(1, padLength), "0")
      const primaryID = `${cleanText(groupForm.tagPrefix)}${sequence}`
      const backTag = `${cleanText(groupForm.backTagPrefix)}${sequence}`
      const EID = `${cleanText(groupForm.eidPrefix)}${sequence}`

      return {
        index: index + 1,
        payload: {
          primaryID,
          EID,
          backTag,
          dateIn: normalizeDate(groupForm.dateIn),
          breed: cleanText(groupForm.breed).toLowerCase(),
          sex,
          weight: parseNumber(groupForm.weight),
          purchasePrice: parseNumber(groupForm.purchasePrice),
          seller: cleanText(groupForm.seller),
          dairy: cleanText(groupForm.dairy),
          currentRanchID: Number(id),
          originRanchID: Number(id),
          status: "feeding",
          proteinLevel: parseNumber(groupForm.proteinLevel),
          proteinTest: cleanText(groupForm.proteinTest).toLowerCase(),
          preDaysOnFeed: parseInteger(groupForm.preDaysOnFeed) ?? 0,
        },
      }
    })

    let created = 0
    let failed = 0
    const errors = []

    try {
      setGroupLoading(true)
      setGroupErrors({})

      for (const row of rows) {
        try {
          await createCalf(row.payload, token)
          created += 1
        } catch (error) {
          failed += 1
          errors.push({
            rowNumber: row.index,
            message: error?.response?.data?.message || error?.message || "Unknown error",
          })
        }
      }

      setGroupResult({ created, failed, errors })
    } finally {
      setGroupLoading(false)
    }
  }

  if (!ranch) return <div>Loading ranch data...</div>

  return (
    <div className="w-full min-h-screen bg-background flex justify-center px-6 py-10">
      <div className="w-full max-w-7xl flex flex-col gap-6">
        <div className="rounded-2xl border border-primary-border/30 bg-white shadow-sm p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-title-h3 text-primary-text">Add Calves</h2>
            <p className="text-sm text-secondary">
              Register calves for <span className="font-semibold">{ranch.name}</span> by Excel, one by one, or quick group.
            </p>
          </div>

          <button
            type="button"
            onClick={buildTemplateFile}
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-primary-border/40 bg-white text-sm font-medium text-primary-text hover:bg-primary-border/10 transition-colors duration-200 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Download Template
          </button>
        </div>

        <div className="rounded-2xl border border-primary-border/30 bg-white p-2 flex flex-wrap gap-2">
          {[{ id: "bulk", label: "Bulk Excel" }, { id: "single", label: "One by one" }, { id: "group", label: "Quick group" }].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={`px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                mode === item.id
                  ? "bg-action-blue text-white"
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
            <DragAndDrop
              onFileSelect={handleFileSelect}
              selectedFile={file}
              disabled={isParsing || isSubmitting}
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={parseExcel}
                disabled={!file || isParsing || isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-action-blue/80 bg-action-blue text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
              >
                {isParsing ? "Processing file..." : "Validate File"}
              </button>

              <button
                type="button"
                onClick={clearFile}
                disabled={!file || isParsing || isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-primary-border/40 bg-white text-sm font-medium text-primary-text hover:bg-primary-border/10 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </button>

              <button
                type="button"
                onClick={handleCreateBulk}
                disabled={validRows.length === 0 || isSubmitting || isParsing}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-action-blue/80 bg-action-blue text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
              >
                {isSubmitting ? "Creating calves..." : `Create ${validRows.length} calves`}
              </button>
            </div>

            {invalidRows.length > 0 && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
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

            {result.failed > 0 && (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
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

            <MainDataTable title="Valid rows preview" rows={previewRows} />
          </>
        )}

        {mode === "single" && (
          <div className="rounded-2xl border border-primary-border/30 bg-white shadow-sm p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              <label className="text-xs font-semibold text-secondary">EID<RequiredMark /></label>
              <div className="relative">
                <input className={clearableInputClass} value={singleForm.EID} onChange={(e) => handleSingleChange("EID", e.target.value)} />
                {singleForm.EID && (
                  <button type="button" className={clearButtonClass} onClick={() => handleSingleChange("EID", "")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {singleErrors.EID && <p className="mt-1 text-xs text-red-600">{singleErrors.EID}</p>}
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
              <div className="relative">
                <input type="date" className={clearableInputClass} value={singleForm.dateIn} onChange={(e) => handleSingleChange("dateIn", e.target.value)} />
                {singleForm.dateIn && (
                  <button type="button" className={clearButtonClass} onClick={() => handleSingleChange("dateIn", "")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {singleErrors.dateIn && <p className="mt-1 text-xs text-red-600">{singleErrors.dateIn}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Breed<RequiredMark /></label>
              <div className="relative">
                <input className={clearableInputClass} value={singleForm.breed} onChange={(e) => handleSingleChange("breed", e.target.value)} />
                {singleForm.breed && (
                  <button type="button" className={clearButtonClass} onClick={() => handleSingleChange("breed", "")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
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
              <div className="relative">
                <input className={clearableInputClass} value={singleForm.seller} onChange={(e) => handleSingleChange("seller", e.target.value)} />
                {singleForm.seller && (
                  <button type="button" className={clearButtonClass} onClick={() => handleSingleChange("seller", "")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
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
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-primary-border/40 bg-white text-sm font-medium text-primary-text hover:bg-primary-border/10 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
              >
                Erase all
              </button>
              <button
                type="button"
                onClick={handleCreateSingle}
                disabled={singleLoading}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-action-blue/80 bg-action-blue text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
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

        {mode === "group" && (
          <div className="rounded-2xl border border-primary-border/30 bg-white shadow-sm p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="lg:col-span-2 rounded-xl border border-primary-border/30 bg-primary-border/5 p-4">
              <h3 className="text-sm font-semibold text-primary-text">Quick Group Instructions</h3>
              <ol className="mt-2 list-decimal pl-5 text-xs text-secondary space-y-1">
                <li>Set `Count` with the number of calves to create.</li>
                <li>Set `Tag Prefix` and optionally `EID Prefix`.</li>
                <li>Set `Start Number` and `Pad Length` to control numbering format.</li>
                <li>Fill shared data (`Breed`, `Sex`, `Seller`, etc.).</li>
                <li>Click `Create group` to register all calves.</li>
              </ol>
              <p className="mt-3 text-xs text-primary-text">
                Example: Prefix `TAG-`, Start `1`, Pad `3`, Count `4` creates:
                <span className="font-semibold"> TAG-001, TAG-002, TAG-003, TAG-004</span>.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-secondary">Count<RequiredMark /></label>
              <input className={fieldClass} value={groupForm.count} onChange={(e) => handleGroupChange("count", e.target.value)} />
              {groupErrors.count && <p className="mt-1 text-xs text-red-600">{groupErrors.count}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Tag Prefix<RequiredMark /></label>
              <input className={fieldClass} value={groupForm.tagPrefix} onChange={(e) => handleGroupChange("tagPrefix", e.target.value)} />
              {groupErrors.tagPrefix && <p className="mt-1 text-xs text-red-600">{groupErrors.tagPrefix}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Back Tag Prefix</label>
              <input className={fieldClass} value={groupForm.backTagPrefix} onChange={(e) => handleGroupChange("backTagPrefix", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Start Number</label>
              <input className={fieldClass} value={groupForm.startNumber} onChange={(e) => handleGroupChange("startNumber", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Pad Length</label>
              <input className={fieldClass} value={groupForm.padLength} onChange={(e) => handleGroupChange("padLength", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">EID Prefix<RequiredMark /></label>
              <input className={fieldClass} value={groupForm.eidPrefix} onChange={(e) => handleGroupChange("eidPrefix", e.target.value)} />
              {groupErrors.eidPrefix && <p className="mt-1 text-xs text-red-600">{groupErrors.eidPrefix}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Date In<RequiredMark /></label>
              <input type="date" className={fieldClass} value={groupForm.dateIn} onChange={(e) => handleGroupChange("dateIn", e.target.value)} />
              {groupErrors.dateIn && <p className="mt-1 text-xs text-red-600">{groupErrors.dateIn}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Breed<RequiredMark /></label>
              <input className={fieldClass} value={groupForm.breed} onChange={(e) => handleGroupChange("breed", e.target.value)} />
              {groupErrors.breed && <p className="mt-1 text-xs text-red-600">{groupErrors.breed}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Sex<RequiredMark /></label>
              <select className={fieldClass} value={groupForm.sex} onChange={(e) => handleGroupChange("sex", e.target.value)}>
                {SEX_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {groupErrors.sex && <p className="mt-1 text-xs text-red-600">{groupErrors.sex}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Seller<RequiredMark /></label>
              <input className={fieldClass} value={groupForm.seller} onChange={(e) => handleGroupChange("seller", e.target.value)} />
              {groupErrors.seller && <p className="mt-1 text-xs text-red-600">{groupErrors.seller}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Weight</label>
              <input className={fieldClass} value={groupForm.weight} onChange={(e) => handleGroupChange("weight", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Purchase Price</label>
              <input className={fieldClass} value={groupForm.purchasePrice} onChange={(e) => handleGroupChange("purchasePrice", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Dairy</label>
              <input className={fieldClass} value={groupForm.dairy} onChange={(e) => handleGroupChange("dairy", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Protein Level</label>
              <input className={fieldClass} value={groupForm.proteinLevel} onChange={(e) => handleGroupChange("proteinLevel", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Protein Test</label>
              <select className={fieldClass} value={groupForm.proteinTest} onChange={(e) => handleGroupChange("proteinTest", e.target.value)}>
                <option value="pending">Pending</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Pre-Days-On-Feed</label>
              <input className={fieldClass} value={groupForm.preDaysOnFeed} onChange={(e) => handleGroupChange("preDaysOnFeed", e.target.value)} />
            </div>

            <div className="lg:col-span-2 flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={groupLoading}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-action-blue/80 bg-action-blue text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
              >
                {groupLoading ? "Creating group..." : "Create group"}
              </button>
            </div>

            {groupResult.failed > 0 && (
              <div className="lg:col-span-2 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                <h3 className="text-sm font-semibold text-yellow-700">Rows failed during creation</h3>
                <ul className="mt-2 space-y-1 text-xs text-yellow-800">
                  {groupResult.errors.slice(0, 15).map((item) => (
                    <li key={`group-error-${item.rowNumber}`}>
                      Row {item.rowNumber}: {item.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AddCalves
