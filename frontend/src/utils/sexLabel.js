const normalizeToken = (value) => {
  const raw = String(value || "").trim()
  if (!raw) return ""

  const collapsed = raw.toLowerCase().replace(/[^a-z]/g, "")
  if (collapsed === "freemartin") return "freeMartin"
  if (collapsed === "bull") return "bull"
  if (collapsed === "heifer") return "heifer"
  if (collapsed === "steer") return "steer"
  return ""
}

const toTitleCase = (value) => (
  String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
)

export const formatSexLabel = (value, fallback = "-") => {
  const raw = String(value || "").trim()
  if (!raw) return fallback

  const token = normalizeToken(raw)
  if (token === "freeMartin") return "Free Martin"
  if (token === "bull") return "Bull"
  if (token === "heifer") return "Heifer"
  if (token === "steer") return "Steer"

  return toTitleCase(raw)
}

