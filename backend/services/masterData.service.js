const { model } = require('../db/libs/sequelize')
const {
  normalizeLookupText,
  normalizeBreedPayload,
  normalizeSellerPayload,
} = require('../utils/masterDataNormalization')

const collapseLookupText = (value) => normalizeLookupText(value).replace(/\s+/g, '')

const levenshteinDistance = (left = '', right = '') => {
  const a = String(left)
  const b = String(right)
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[a.length][b.length]
}

const findBestExistingName = (inputName, rows = []) => {
  const normalizedInput = normalizeLookupText(inputName)
  const collapsedInput = collapseLookupText(inputName)
  if (!normalizedInput || !collapsedInput) return null

  const candidates = rows
    .map((item) => {
      const name = String(item?.name || '').trim()
      if (!name) return null
      const normalized = normalizeLookupText(name)
      const collapsed = collapseLookupText(name)
      if (!normalized || !collapsed) return null
      return { name, normalized, collapsed }
    })
    .filter(Boolean)

  if (candidates.length === 0) return null

  const exact = candidates.find((candidate) => (
    candidate.normalized === normalizedInput || candidate.collapsed === collapsedInput
  ))
  if (exact) return exact.name

  if (collapsedInput.length >= 4) {
    const containsMatch = candidates.find((candidate) => (
      candidate.collapsed.includes(collapsedInput) || collapsedInput.includes(candidate.collapsed)
    ))
    if (containsMatch) return containsMatch.name
  }

  if (collapsedInput.length < 4) return null

  let bestCandidate = null
  let bestScore = 0
  for (const candidate of candidates) {
    const distance = levenshteinDistance(collapsedInput, candidate.collapsed)
    const maxLength = Math.max(collapsedInput.length, candidate.collapsed.length)
    const score = maxLength > 0 ? 1 - (distance / maxLength) : 0
    if (score > bestScore) {
      bestScore = score
      bestCandidate = candidate
    }
  }

  return bestScore >= 0.76 ? bestCandidate?.name || null : null
}

const ensureBreedName = async (rawName, options = {}) => {
  const payload = normalizeBreedPayload({ name: rawName })
  if (!payload.name) return null

  const allowCreate = options.allowCreate !== false
  const allowFuzzy = options.fuzzyMatch === true
  const rows = await model.Breeds.findAll({ raw: true })
  const normalized = normalizeLookupText(payload.name)
  const existing = rows.find((item) => normalizeLookupText(item.name) === normalized)
  if (existing?.name) return existing.name

  if (allowFuzzy) {
    const fuzzyMatch = findBestExistingName(payload.name, rows)
    if (fuzzyMatch) return fuzzyMatch
  }

  if (!allowCreate) return null

  const created = await model.Breeds.create(payload)
  return created.name
}

const ensureSellerName = async (rawName, options = {}) => {
  const payload = normalizeSellerPayload({ name: rawName })
  if (!payload.name) return null

  const allowCreate = options.allowCreate !== false
  const allowFuzzy = options.fuzzyMatch === true
  const rows = await model.Sellers.findAll({ raw: true })
  const normalized = normalizeLookupText(payload.name)
  const existing = rows.find((item) => normalizeLookupText(item.name) === normalized)
  if (existing?.name) return existing.name

  if (allowFuzzy) {
    const fuzzyMatch = findBestExistingName(payload.name, rows)
    if (fuzzyMatch) return fuzzyMatch
  }

  if (!allowCreate) return null

  const created = await model.Sellers.create({ name: payload.name })
  return created.name
}

module.exports = {
  ensureBreedName,
  ensureSellerName,
}
