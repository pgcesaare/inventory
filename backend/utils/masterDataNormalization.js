const normalizeWhitespace = (value) => String(value || '')
  .trim()
  .replace(/\s+/g, ' ')

const removeDiacritics = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')

const normalizeLookupText = (value) => removeDiacritics(normalizeWhitespace(value))
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const toTitleCase = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/\b\w/g, (match) => match.toUpperCase())

const normalizeState = (value) => {
  const clean = normalizeWhitespace(value).toUpperCase().replace(/[^A-Z]/g, '')
  if (!clean) return null
  return clean.length > 2 ? clean.slice(0, 2) : clean
}

const normalizeZipCode = (value) => {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.length >= 9) return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`
  return digits.slice(0, 5)
}

const normalizeOrderIndex = (value) => {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined
  const integer = Math.trunc(parsed)
  if (integer < 0) return undefined
  return integer
}

const normalizeBreedPayload = (payload = {}) => {
  const name = toTitleCase(payload.name)
  const orderIndex = normalizeOrderIndex(payload.orderIndex)
  const result = { name }
  if (orderIndex !== undefined) result.orderIndex = orderIndex
  return result
}

const normalizeSellerPayload = (payload = {}) => {
  const name = toTitleCase(payload.name)
  const address = normalizeWhitespace(payload.address || '') || null
  const city = toTitleCase(payload.city || '') || null
  const state = normalizeState(payload.state)
  const zipCode = normalizeZipCode(payload.zipCode)

  return {
    name,
    address,
    city,
    state,
    zipCode,
  }
}

module.exports = {
  normalizeWhitespace,
  normalizeLookupText,
  toTitleCase,
  normalizeState,
  normalizeZipCode,
  normalizeOrderIndex,
  normalizeBreedPayload,
  normalizeSellerPayload,
}
