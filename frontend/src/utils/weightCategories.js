export const DEFAULT_WEIGHT_CATEGORIES = []

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const normalizeWeightCategories = (categories) => {
  const source = Array.isArray(categories) ? categories : DEFAULT_WEIGHT_CATEGORIES
  return source.map((item, index) => ({
    key: item?.key || `category_${index + 1}`,
    min: toNullableNumber(item?.min),
    max: toNullableNumber(item?.max),
    label: String(item?.label || `Category ${index + 1}`),
    description: String(item?.description || ""),
  }))
}

export const createWeightCategory = (index = 0) => ({
  key: `category_${Date.now()}_${index}`,
  min: null,
  max: null,
  label: "",
  description: "",
})

export const getWeightCategoryLabel = (weightValue, categories) => {
  const weight = Number(weightValue)
  if (!Number.isFinite(weight)) return "-"

  const normalized = normalizeWeightCategories(categories)
  for (const category of normalized) {
    const minOk = category.min === null || weight >= category.min
    const maxOk = category.max === null || weight <= category.max
    if (minOk && maxOk) return category.label
  }

  return "-"
}
