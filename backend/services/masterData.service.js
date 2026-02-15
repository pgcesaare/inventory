const { model } = require('../db/libs/sequelize')
const {
  normalizeLookupText,
  normalizeBreedPayload,
  normalizeSellerPayload,
} = require('../utils/masterDataNormalization')

const ensureBreedName = async (rawName) => {
  const payload = normalizeBreedPayload({ name: rawName })
  if (!payload.name) return null

  const rows = await model.Breeds.findAll({ raw: true })
  const normalized = normalizeLookupText(payload.name)
  const existing = rows.find((item) => normalizeLookupText(item.name) === normalized)
  if (existing?.name) return existing.name

  const created = await model.Breeds.create(payload)
  return created.name
}

const ensureSellerName = async (rawName) => {
  const payload = normalizeSellerPayload({ name: rawName })
  if (!payload.name) return null

  const rows = await model.Sellers.findAll({ raw: true })
  const normalized = normalizeLookupText(payload.name)
  const existing = rows.find((item) => normalizeLookupText(item.name) === normalized)
  if (existing?.name) return existing.name

  const created = await model.Sellers.create({ name: payload.name })
  return created.name
}

module.exports = {
  ensureBreedName,
  ensureSellerName,
}
