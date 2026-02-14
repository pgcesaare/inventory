const getCreatedByFromRequest = (req) => {
  const payload = req?.auth?.payload || {}
  const fullNameFromParts = [payload.given_name, payload.family_name]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(" ")
  const value =
    payload.name ||
    fullNameFromParts ||
    payload.preferred_username ||
    payload.nickname ||
    null

  if (!value) return null
  return String(value).trim() || null
}

module.exports = { getCreatedByFromRequest }
