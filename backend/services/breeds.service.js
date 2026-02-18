const boom = require('@hapi/boom')
const { model } = require('../db/libs/sequelize')
const { normalizeBreedPayload, normalizeLookupText, normalizeOrderIndex } = require('../utils/masterDataNormalization')

const findByNormalizedName = async (name, ignoreId = null) => {
  const rows = await model.Breeds.findAll({ raw: true })
  const normalizedTarget = normalizeLookupText(name)

  return rows.find((item) => {
    if (ignoreId && Number(item.id) === Number(ignoreId)) return false
    return normalizeLookupText(item.name) === normalizedTarget
  }) || null
}

class BreedsService {
  async create(data) {
    const payload = normalizeBreedPayload(data)
    if (!payload.name) throw boom.badRequest('Breed name is required')

    const existing = await findByNormalizedName(payload.name)
    if (existing) throw boom.conflict('Breed already exists')

    if (payload.orderIndex === undefined) {
      const maxOrderIndex = await model.Breeds.max('orderIndex')
      const safeMaxOrderIndex = Number.isFinite(Number(maxOrderIndex)) ? Number(maxOrderIndex) : -1
      payload.orderIndex = safeMaxOrderIndex + 1
    }

    return model.Breeds.create(payload)
  }

  async findAll() {
    return model.Breeds.findAll({
      order: [['orderIndex', 'ASC'], ['id', 'ASC']],
    })
  }

  async findOne(id) {
    const breed = await model.Breeds.findByPk(id)
    if (!breed) throw boom.notFound('Breed not found')
    return breed
  }

  async update(id, changes) {
    const breed = await this.findOne(id)
    const payload = {}

    if (Object.prototype.hasOwnProperty.call(changes, 'name')) {
      const normalized = normalizeBreedPayload({ name: changes.name })
      if (!normalized.name) throw boom.badRequest('Breed name is required')

      const existing = await findByNormalizedName(normalized.name, id)
      if (existing) throw boom.conflict('Breed already exists')
      payload.name = normalized.name
    }

    if (Object.prototype.hasOwnProperty.call(changes, 'orderIndex')) {
      const normalizedOrderIndex = normalizeOrderIndex(changes.orderIndex)
      if (normalizedOrderIndex === undefined) {
        throw boom.badRequest('orderIndex must be a non-negative integer')
      }
      payload.orderIndex = normalizedOrderIndex
    }

    if (Object.keys(payload).length === 0) {
      return breed
    }

    return breed.update(payload)
  }

  async delete(id) {
    const breed = await this.findOne(id)
    await breed.destroy()
    return { id: Number(id) }
  }
}

module.exports = BreedsService
