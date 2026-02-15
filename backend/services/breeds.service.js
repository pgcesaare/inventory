const boom = require('@hapi/boom')
const { model } = require('../db/libs/sequelize')
const { normalizeBreedPayload, normalizeLookupText } = require('../utils/masterDataNormalization')

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

    return model.Breeds.create(payload)
  }

  async findAll() {
    return model.Breeds.findAll({
      order: [['name', 'ASC']],
    })
  }

  async findOne(id) {
    const breed = await model.Breeds.findByPk(id)
    if (!breed) throw boom.notFound('Breed not found')
    return breed
  }

  async update(id, changes) {
    const breed = await this.findOne(id)
    const payload = normalizeBreedPayload({
      ...breed.toJSON(),
      ...changes,
    })
    if (!payload.name) throw boom.badRequest('Breed name is required')

    const existing = await findByNormalizedName(payload.name, id)
    if (existing) throw boom.conflict('Breed already exists')

    return breed.update(payload)
  }

  async delete(id) {
    const breed = await this.findOne(id)
    await breed.destroy()
    return { id: Number(id) }
  }
}

module.exports = BreedsService
