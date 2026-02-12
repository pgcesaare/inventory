const { sequelize, model } = require('../db/libs/sequelize')

class LoadsService {
  constructor() {}

  async findAll() {
    return await model.Loads.findAll({ include: { all: true } })
  }

  async findOne(id) {
    const load = await model.Loads.findByPk(id, {
      include: [
        { model: model.Ranches, as: 'origin' },
        { model: model.Ranches, as: 'destination' },
        {
          model: model.CalfLoads,
          as: 'load',
          include: [{ model: model.Calves, as: 'calf' }]
        }
      ]
    })

    if (!load) return null

    const data = load.toJSON()
    return {
      ...data,
      headCount: data.load?.length || 0,
      shippedOutDate: data.departureDate || null,
      shippedTo: data.destination?.name || data.destinationName || null,
      calves: (data.load || []).map((item) => ({
        id: item.calf?.id,
        primaryID: item.calf?.primaryID || null,
        EID: item.calf?.EID || null,
        status: item.calf?.status || null
      }))
    }
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
        headCount: data.load?.length || 0,
        shippedOutDate: data.departureDate || null,
        shippedTo: data.destination?.name || data.destinationName || null
      }
    })

    return result
  }

  async createLoad({
    eids = [],
    primaryIDs = [],
    originRanchID,
    destinationRanchID,
    destinationName,
    departureDate,
    arrivalDate,
    notes,
    trucking
  }) {
    const t = await sequelize.transaction()

    try {
      const destinationRanchIdValue = destinationRanchID ? Number(destinationRanchID) : null
      const customDestination = String(destinationName || '').trim() || null

      if (!destinationRanchIdValue && !customDestination) {
        throw new Error('Destination ranch or custom destination is required')
      }

      // Create load
      let destinationLabel = customDestination

      if (destinationRanchIdValue) {
        const destinationRanch = await model.Ranches.findByPk(destinationRanchIdValue, { transaction: t })
        destinationLabel = destinationRanch?.name || destinationLabel
      }

      const load = await model.Loads.create({
        originRanchID,
        destinationRanchID: destinationRanchIdValue,
        destinationName: destinationLabel,
        departureDate,
        arrivalDate,
        notes,
        trucking
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
                currentRanchID: destinationRanchIdValue || calf.currentRanchID,
                status: "feeding",
                shippedOutDate: departureDate || null,
                shippedTo: destinationLabel
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

        const movementEntries = calves.map(calf => ({
          calfID: calf.id,
          loadID: load.id,
          movementType: 'load_transfer',
          eventDate: departureDate || new Date(),
          fromRanchID: originRanchID || calf.currentRanchID || null,
          toRanchID: destinationRanchIdValue || null,
          fromStatus: calf.status || 'feeding',
          toStatus: 'feeding',
          notes: notes || trucking || 'Transferred by load'
        }))

        await model.CalfMovementHistory.bulkCreate(movementEntries, { transaction: t })
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
