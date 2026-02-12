const pad2 = (value) => String(value).padStart(2, "0")

const fromIsoDateString = (value) => {
  if (typeof value !== "string") return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  const [, year, month, day] = match
  return `${month}/${day}/${year}`
}

export const formatDateMMDDYYYY = (value, fallback = "-") => {
  if (value === null || value === undefined || value === "") return fallback

  const isoDirect = fromIsoDateString(value)
  if (isoDirect) return isoDirect

  if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return value
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return fallback

  const month = pad2(date.getUTCMonth() + 1)
  const day = pad2(date.getUTCDate())
  const year = date.getUTCFullYear()
  return `${month}/${day}/${year}`
}

