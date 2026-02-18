import { formatSexLabel } from "./sexLabel"

const toTitleCase = (value) => (
  value
    ? String(value).toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
    : ""
)

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "-"
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return "-"
  return `$${numeric.toLocaleString()}`
}

export const buildCalfDetailRows = ({
  calfInfo,
  selectedCalf = null,
  selectedCalfDetails = null,
  formatDate,
  formatDateTime,
  calculateDaysOnFeed,
  getWeightBracketLabel,
  effectiveWeightBrackets = [],
  formatStatus,
}) => {
  if (!calfInfo) return []

  const purchasePriceValue = calfInfo.purchasePrice ?? calfInfo.price
  const sellPriceValue = calfInfo.sellPrice
  const statusValue = typeof formatStatus === "function"
    ? formatStatus(calfInfo)
    : (calfInfo.status || "-")

  return [
    { label: "Visual Tag", value: calfInfo.primaryID || selectedCalf?.visualTag || "-" },
    { label: "EID", value: calfInfo.EID || selectedCalf?.eid || "-" },
    { label: "Back Tag", value: calfInfo.backTag || calfInfo.originalID || "-" },
    { label: "Date In", value: formatDate(calfInfo.dateIn || calfInfo.placedDate) },
    { label: "Breed", value: toTitleCase(calfInfo.breed) || selectedCalf?.breed || "-" },
    { label: "Sex", value: formatSexLabel(calfInfo.sex, selectedCalf?.sex || "-") },
    { label: "Weight", value: calfInfo.weight ?? "-" },
    { label: "Weight Bracket", value: getWeightBracketLabel(calfInfo.weight, effectiveWeightBrackets, calfInfo.breed) },
    { label: "Paid Price", value: formatCurrency(purchasePriceValue) },
    { label: "Sell Price", value: formatCurrency(sellPriceValue) },
    { label: "Seller", value: calfInfo.seller || "-" },
    { label: "Dairy", value: calfInfo.dairy || "-" },
    { label: "Condition", value: calfInfo.condition || selectedCalfDetails?.condition || selectedCalf?.condition || "-" },
    { label: "Status", value: statusValue },
    { label: "Protein Level", value: calfInfo.proteinLevel ?? "-" },
    { label: "Protein Test", value: calfInfo.proteinTest || "-" },
    { label: "Death Date", value: formatDate(calfInfo.deathDate) },
    { label: "Pre DOF", value: calfInfo.preDaysOnFeed ?? "-" },
    { label: "DOF", value: calculateDaysOnFeed(calfInfo) },
    { label: "Created By", value: calfInfo.createdBy || calfInfo.created_by || "N/A" },
    { label: "Created At", value: formatDateTime(calfInfo.createdAt || calfInfo.created_at) },
    { label: "Updated At", value: formatDateTime(calfInfo.updatedAt || calfInfo.updated_at) },
  ]
}
