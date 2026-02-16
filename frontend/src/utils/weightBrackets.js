export const DEFAULT_WEIGHT_BRACKETS = []

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeBreedList = (value) => {
  if (!Array.isArray(value)) return []

  const unique = new Map()
  value.forEach((item) => {
    const normalized = String(item || "").trim()
    if (!normalized) return
    const key = normalized.toLowerCase()
    if (!unique.has(key)) unique.set(key, normalized)
  })

  return Array.from(unique.values())
}

export const normalizeWeightBrackets = (brackets) => {
  const source = Array.isArray(brackets) ? brackets : DEFAULT_WEIGHT_BRACKETS
  return source.map((item, index) => ({
    key: item?.key || `bracket_${index + 1}`,
    min: toNullableNumber(item?.min),
    max: toNullableNumber(item?.max),
    label: String(item?.label || `Bracket ${index + 1}`),
    description: String(item?.description || ""),
    breeds: normalizeBreedList(item?.breeds),
  }))
}

export const createWeightBracket = (index = 0) => ({
  key: `bracket_${Date.now()}_${index}`,
  min: null,
  max: null,
  label: "",
  description: "",
  breeds: [],
})

export const getWeightBracketLabel = (weightValue, brackets, breedValue = "") => {
  const weight = Number(weightValue)
  if (!Number.isFinite(weight)) return "-"

  const normalized = normalizeWeightBrackets(brackets)
  const normalizedBreed = String(breedValue || "").trim().toLowerCase()
  for (const bracket of normalized) {
    const allowedBreeds = normalizeBreedList(bracket.breeds).map((item) => item.toLowerCase())
    const breedMatches = allowedBreeds.length === 0 || (normalizedBreed && allowedBreeds.includes(normalizedBreed))
    if (!breedMatches) continue

    const minOk = bracket.min === null || weight >= bracket.min
    const maxOk = bracket.max === null || weight <= bracket.max
    if (minOk && maxOk) return bracket.label
  }

  return "-"
}
