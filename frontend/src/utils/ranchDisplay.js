export const formatRanchDisplayName = (value) => {
  const text = String(value ?? "").trim()
  if (!text) return ""
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
}

export const normalizeRanchDisplay = (ranch) => {
  if (!ranch || typeof ranch !== "object") return ranch
  return {
    ...ranch,
    name: formatRanchDisplayName(ranch.name),
  }
}
