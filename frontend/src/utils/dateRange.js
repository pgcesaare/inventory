const pad2 = (value) => String(value).padStart(2, "0")

const toLocalDateKeyFromDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  return `${year}-${month}-${day}`
}

export const toDateKey = (value) => {
  if (value === null || value === undefined || value === "") return ""

  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, year, month, day] = match
      return `${year}-${month}-${day}`
    }

    const parsed = new Date(value)
    return toLocalDateKeyFromDate(parsed)
  }

  if (value instanceof Date) {
    return toLocalDateKeyFromDate(value)
  }

  if (typeof value === "number") {
    return toLocalDateKeyFromDate(new Date(value))
  }

  return ""
}

export const isDateInDateRange = (value, from, to) => {
  const valueKey = toDateKey(value)
  const fromKey = toDateKey(from)
  const toKey = toDateKey(to)

  if (!fromKey && !toKey) return true
  if (!valueKey) return false
  if (fromKey && valueKey < fromKey) return false
  if (toKey && valueKey > toKey) return false
  return true
}
