const PACIFIC_TIMEZONE = "America/Los_Angeles"

const getPartsInPacificTime = (date) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const toMap = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    month: toMap.month,
    day: toMap.day,
    year: toMap.year,
    hour: toMap.hour,
    minute: toMap.minute,
    second: toMap.second,
  }
}

const getPacificTimeZoneLabel = (date) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIMEZONE,
    timeZoneName: "short",
  })
  const zonePart = formatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")
  return zonePart?.value || "PT"
}

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

  const { month, day, year } = getPartsInPacificTime(date)
  return `${month}/${day}/${year}`
}

export const formatDateTimeMMDDYYYY = (value, fallback = "-") => {
  if (value === null || value === undefined || value === "") return fallback

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return fallback

  const { month, day, year, hour, minute, second } = getPartsInPacificTime(date)
  const zoneLabel = getPacificTimeZoneLabel(date)
  return `${month}/${day}/${year} ${hour}:${minute}:${second} ${zoneLabel}`
}
