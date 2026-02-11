const { sequelize, model } = require('../db/libs/sequelize')

class LoadsService {
  constructor() {}

  async findAll() {
    return await model.Loads.findAll({ include: { all: true } })
  }

  async findOne(id) {
    return await model.Loads.findByPk(id)
  }

  async update(id, changes) {
    const load = await this.findOne(id)
    return await load.update(changes)
  }

  async delete(id) {
    const load = await this.findOne(id)
    await load.destroy()
    return { id }
  }

  async findLoadbyRanch(id) {
    const loads = await model.Loads.findAll({
      where: {
        originRanchID: id
      },
      include: { all: true },
      order: [['departureDate', 'DESC']]
    })

    const result = loads.map(load => {
      const data = load.toJSON()
      return {
        ...data,
        headCount: data.load?.length || 0
      }
    })

    return result
  }

  async createLoad({
    eids = [],
    primaryIDs = [],
    originRanchID,
    destinationRanchID,
    departureDate,
    arrivalDate,
    notes
  }) {
    const t = await sequelize.transaction()

    try {
      // Create load
      const load = await model.Loads.create({
        originRanchID,
        destinationRanchID,
        departureDate,
        arrivalDate,
        notes
      }, { transaction: t })

      // If no filters → do NOT modify calves
      const hasEids = Array.isArray(eids) && eids.length > 0
      const hasPrimary = Array.isArray(primaryIDs) && primaryIDs.length > 0

      if (!hasEids && !hasPrimary) {
        await t.commit()
        return load
      }

      // Build where ONLY if filters exist
      const where = { status: "feeding" }
      if (hasEids) where.EID = eids.map(eid => String(eid))
      if (hasPrimary) where.primaryID = primaryIDs

      // Find calves
      const calves = await model.Calves.findAll({ where, transaction: t })

      if (calves.length > 0) {
        // Update calves
        await Promise.all(
          calves.map(calf =>
            model.Calves.update(
              {
                currentRanchID: destinationRanchID,
                status: "shipped"
              },
              { where: { id: calf.id }, transaction: t }
            )
          )
        )

        // Register load history
        const historyEntries = calves.map(calf => ({
          calfID: calf.id,
          loadID: load.id
        }))

        await model.CalfLoads.bulkCreate(historyEntries, { transaction: t })
      }

      await t.commit()
      return load

    } catch (error) {
      await t.rollback()
      console.error("❌ Transaction failed, rolled back:", error)
      throw error
    }
  }
}

module.exports = LoadsService
