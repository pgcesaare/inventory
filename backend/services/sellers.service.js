const boom = require('@hapi/boom')
const { model } = require('../db/libs/sequelize')
const { normalizeSellerPayload, normalizeLookupText } = require('../utils/masterDataNormalization')

const buildSellerKey = (item) => ([
  normalizeLookupText(item?.name),
  normalizeLookupText(item?.address),
  normalizeLookupText(item?.city),
  normalizeLookupText(item?.state),
  normalizeLookupText(item?.zipCode || item?.zip_code),
].join('|'))

const findByNormalizedIdentity = async (payload, ignoreId = null) => {
  const rows = await model.Sellers.findAll({ raw: true })
  const targetKey = buildSellerKey(payload)

  return rows.find((item) => {
    if (ignoreId && Number(item.id) === Number(ignoreId)) return false
    return buildSellerKey(item) === targetKey
  }) || null
}

class SellersService {
  async create(data) {
    const payload = normalizeSellerPayload(data)
    if (!payload.name) throw boom.badRequest('Seller name is required')

    const existing = await findByNormalizedIdentity(payload)
    if (existing) throw boom.conflict('Seller already exists')

    return model.Sellers.create(payload)
  }

  async findAll() {
    return model.Sellers.findAll({
      order: [['name', 'ASC']],
    })
  }

  async findOne(id) {
    const seller = await model.Sellers.findByPk(id)
    if (!seller) throw boom.notFound('Seller not found')
    return seller
  }

  async update(id, changes) {
    const seller = await this.findOne(id)
    const payload = normalizeSellerPayload({
      ...seller.toJSON(),
      ...changes,
    })
    if (!payload.name) throw boom.badRequest('Seller name is required')

    const existing = await findByNormalizedIdentity(payload, id)
    if (existing) throw boom.conflict('Seller already exists')

    return seller.update(payload)
  }

  async delete(id) {
    const seller = await this.findOne(id)
    await seller.destroy()
    return { id: Number(id) }
  }
}

module.exports = SellersService
