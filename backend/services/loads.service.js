const { Op } = require('sequelize')
const boom = require('@hapi/boom')
const { sequelize, model } = require('../db/libs/sequelize')

class LoadsService {
  constructor() {}

  toPositiveIntegerOrNull(value) {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }

  getLoadStatus(loadData = {}) {
    const notesValue = String(loadData.notes || '').toLowerCase()
    if (/(canceled|cancelled|cancel)/.test(notesValue)) return 'canceled'

    const headCount = Number(loadData.load?.length ?? loadData.headCount ?? 0)
    if (!Number.isFinite(headCount) || headCount <= 0) return 'draft'
    if (loadData.arrivalDate) return 'arrived'
    return 'in_transit'
  }

  getAuditTimestamps(entity) {
    const data = entity?.toJSON ? entity.toJSON() : (entity || {})
    const createdAt =
      data.createdAt ||
      data.created_at ||
      entity?.createdAt ||
      entity?.created_at ||
      (typeof entity?.get === 'function' ? entity.get('created_at') : null) ||
      null
    const updatedAt =
      data.updatedAt ||
      data.updated_at ||
      entity?.updatedAt ||
      entity?.updated_at ||
      (typeof entity?.get === 'function' ? entity.get('updated_at') : null) ||
      null
    return { createdAt, updatedAt }
  }

  getCreatedBy(entity) {
    const data = entity?.toJSON ? entity.toJSON() : (entity || {})
    return (
      data.createdBy ||
      data.created_by ||
      entity?.createdBy ||
      entity?.created_by ||
      (typeof entity?.get === 'function' ? entity.get('created_by') : null) ||
      null
    )
  }

  normalizeIdentifierList(values = []) {
    if (!Array.isArray(values)) return []
    return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
  }

  normalizeLoadCalfArrivalStatus(value) {
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_')
    if (!normalized) return null
    if (normalized === 'doa') return 'doa'
    if (normalized === 'issue') return 'issue'
    if (normalized === 'not_in_load') return 'not_in_load'
    return null
  }

  parseDateToLocalDayStart(value) {
    if (!value) return null

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null
      return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    }

    const raw = String(value).trim()
    const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1])
      const month = Number(dateOnlyMatch[2]) - 1
      const day = Number(dateOnlyMatch[3])
      const localDate = new Date(year, month, day)
      if (
        localDate.getFullYear() === year &&
        localDate.getMonth() === month &&
        localDate.getDate() === day
      ) {
        return localDate
      }
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }

  calculateDaysOnFeedAtShipment(calf = {}, shipmentDateValue) {
    const intakeRaw = calf.placedDate || calf.dateIn || null
    const intakeStart = this.parseDateToLocalDayStart(intakeRaw)
    const shipmentDay = this.parseDateToLocalDayStart(shipmentDateValue) || new Date()
    const preDaysRaw = Number(calf.preDaysOnFeed || 0)
    const preDays = Number.isFinite(preDaysRaw) ? Math.max(0, preDaysRaw) : 0

    if (!intakeStart) return preDays

    const elapsedDays = Math.floor((shipmentDay.getTime() - intakeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const safeElapsedDays = Math.max(elapsedDays, 1)

    return safeElapsedDays + preDays
  }

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
    const { createdAt, updatedAt } = this.getAuditTimestamps(load)
    const createdBy = this.getCreatedBy(load)
    const status = this.getLoadStatus(data)
    return {
      ...data,
      createdAt,
      updatedAt,
      createdBy,
      status,
      headCount: data.load?.length || 0,
      shippedOutDate: data.departureDate || null,
      shippedTo: data.destination?.name || data.destinationName || null,
      calves: (data.load || []).map((item) => ({
        id: item.calf?.id,
        primaryID: item.calf?.primaryID || null,
        EID: item.calf?.EID || null,
        originalID: item.calf?.originalID || null,
        breed: item.calf?.breed || null,
        sex: item.calf?.sex || null,
        seller: item.calf?.seller || null,
        status: item.calf?.status || null,
        placedDate: item.calf?.placedDate || null,
        price: item.calf?.price ?? null,
        purchasePrice: item.calf?.price ?? null,
        sellPrice: item.calf?.sellPrice ?? null,
        deathDate: item.calf?.deathDate || null,
        shippedOutDate: item.calf?.shippedOutDate || null,
        shippedTo: item.calf?.shippedTo || null,
        originRanchID: item.calf?.originRanchID ?? null,
        currentRanchID: item.calf?.currentRanchID ?? null,
        daysOnFeedAtShipment: Number.isFinite(Number(item.daysOnFeedAtShipment))
          ? Number(item.daysOnFeedAtShipment)
          : null,
        arrivalStatus: this.normalizeLoadCalfArrivalStatus(item.arrivalStatus),
        createdBy: item.calf?.createdBy || item.calf?.created_by || null
      }))
    }
  }

  async update(id, changes) {
    const t = await sequelize.transaction()

    try {
      const load = await model.Loads.findByPk(id, {
        include: [{
          model: model.CalfLoads,
          as: 'load',
          include: [{ model: model.Calves, as: 'calf' }]
        }],
        transaction: t
      })

      if (!load) {
        await t.rollback()
        return null
      }

      const currentData = load.toJSON()
      const hasPrimaryIDs = Object.prototype.hasOwnProperty.call(changes || {}, 'primaryIDs')
      const hasEids = Object.prototype.hasOwnProperty.call(changes || {}, 'eids')
      const hasCalfSelectionChanges = hasPrimaryIDs || hasEids

      const primaryIDs = this.normalizeIdentifierList(changes?.primaryIDs)
      const eids = this.normalizeIdentifierList(changes?.eids)
      const originRanchID = changes?.originRanchID ?? currentData.originRanchID
      const destinationRanchID = Object.prototype.hasOwnProperty.call(changes || {}, 'destinationRanchID')
        ? (changes.destinationRanchID ? Number(changes.destinationRanchID) : null)
        : (currentData.destinationRanchID ? Number(currentData.destinationRanchID) : null)
      const customDestination = Object.prototype.hasOwnProperty.call(changes || {}, 'destinationName')
        ? String(changes.destinationName || '').trim()
        : String(currentData.destinationName || '').trim()

      if (!destinationRanchID && !customDestination) {
        throw new Error('Destination ranch or custom destination is required')
      }

      let destinationLabel = customDestination || currentData.destinationName || null
      if (destinationRanchID) {
        const destinationRanch = await model.Ranches.findByPk(destinationRanchID, { transaction: t })
        destinationLabel = destinationRanch?.name || destinationLabel
      }
      const transferStatus = destinationRanchID ? 'feeding' : 'shipped'

      const updatedFields = {
        originRanchID,
        destinationRanchID,
        destinationName: destinationLabel,
      }

      if (Object.prototype.hasOwnProperty.call(changes || {}, 'departureDate')) {
        updatedFields.departureDate = changes.departureDate || null
      }
      if (Object.prototype.hasOwnProperty.call(changes || {}, 'arrivalDate')) {
        updatedFields.arrivalDate = changes.arrivalDate || null
      }
      if (Object.prototype.hasOwnProperty.call(changes || {}, 'notes')) {
        updatedFields.notes = changes.notes || null
      }
      if (Object.prototype.hasOwnProperty.call(changes || {}, 'afterArrivalNotes')) {
        updatedFields.afterArrivalNotes = changes.afterArrivalNotes || null
      }
      if (Object.prototype.hasOwnProperty.call(changes || {}, 'trucking')) {
        updatedFields.trucking = changes.trucking || null
      }
      const effectiveDepartureDate = updatedFields.departureDate || currentData.departureDate || new Date()

      await load.update(updatedFields, { transaction: t })

      const existingRows = currentData.load || []
      const existingCalfIds = new Set(existingRows.map((row) => row.calfID).filter(Boolean))
      let nextCalfIds = [...existingCalfIds]

      if (hasCalfSelectionChanges) {
        if (primaryIDs.length === 0 && eids.length === 0) {
          nextCalfIds = []
        } else {
          const queryWhere = {}
          if (primaryIDs.length > 0 && eids.length > 0) {
            queryWhere[Op.or] = [
              { primaryID: { [Op.in]: primaryIDs } },
              { EID: { [Op.in]: eids } }
            ]
          } else if (primaryIDs.length > 0) {
            queryWhere.primaryID = { [Op.in]: primaryIDs }
          } else {
            queryWhere.EID = { [Op.in]: eids }
          }

          const matchedCalves = await model.Calves.findAll({
            where: queryWhere,
            transaction: t
          })

          const allowedStatuses = new Set(['feeding', 'alive'])
          const nextSet = new Set()
          matchedCalves.forEach((calf) => {
            const statusValue = String(calf.status || '').toLowerCase()
            const alreadyInLoad = existingCalfIds.has(calf.id)
            const availableFromOrigin = Number(calf.currentRanchID) === Number(originRanchID) && allowedStatuses.has(statusValue)
            if (alreadyInLoad || availableFromOrigin) {
              nextSet.add(calf.id)
            }
          })
          nextCalfIds = [...nextSet]
        }
      }

      const nextSet = new Set(nextCalfIds)
      const removedCalfIds = [...existingCalfIds].filter((idValue) => !nextSet.has(idValue))
      const addedCalfIds = nextCalfIds.filter((idValue) => !existingCalfIds.has(idValue))
      const keptCalfIds = nextCalfIds.filter((idValue) => existingCalfIds.has(idValue))

      if (removedCalfIds.length > 0) {
        await model.CalfLoads.destroy({
          where: {
            loadID: load.id,
            calfID: { [Op.in]: removedCalfIds }
          },
          transaction: t
        })

        await model.Calves.update(
          {
            currentRanchID: originRanchID || null,
            status: 'feeding',
            shippedOutDate: null,
            shippedTo: null
          },
          {
            where: { id: { [Op.in]: removedCalfIds } },
            transaction: t
          }
        )

        await model.CalfMovementHistory.bulkCreate(
          removedCalfIds.map((calfID) => ({
            calfID,
            loadID: load.id,
            movementType: 'status_change',
            eventDate: effectiveDepartureDate,
            fromRanchID: destinationRanchID || null,
            toRanchID: originRanchID || null,
            fromStatus: transferStatus,
            toStatus: 'feeding',
            notes: `Removed from load #${load.id} during edit`
          })),
          { transaction: t }
        )
      }

      if (addedCalfIds.length > 0) {
        const calvesBeforeUpdate = await model.Calves.findAll({
          where: { id: { [Op.in]: addedCalfIds } },
          transaction: t
        })

        await model.CalfLoads.bulkCreate(
          calvesBeforeUpdate.map((calf) => ({
            calfID: calf.id,
            loadID: load.id,
            daysOnFeedAtShipment: this.calculateDaysOnFeedAtShipment(calf, effectiveDepartureDate),
            arrivalStatus: null
          })),
          { transaction: t }
        )

        const addUpdatePayload = {
          status: transferStatus,
          shippedOutDate: effectiveDepartureDate || null,
          shippedTo: destinationLabel || null
        }
        if (destinationRanchID) {
          addUpdatePayload.currentRanchID = destinationRanchID
        }

        await model.Calves.update(
          addUpdatePayload,
          {
            where: { id: { [Op.in]: addedCalfIds } },
            transaction: t
          }
        )

        await model.CalfMovementHistory.bulkCreate(
          calvesBeforeUpdate.map((calf) => ({
            calfID: calf.id,
            loadID: load.id,
            movementType: 'load_transfer',
            eventDate: effectiveDepartureDate,
            fromRanchID: originRanchID || calf.currentRanchID || null,
            toRanchID: destinationRanchID || null,
            fromStatus: calf.status || 'feeding',
            toStatus: transferStatus,
            notes: `Added to load #${load.id} during edit`
          })),
          { transaction: t }
        )
      }

      if (keptCalfIds.length > 0) {
        const keptUpdatePayload = {
          status: transferStatus,
          shippedOutDate: effectiveDepartureDate || null,
          shippedTo: destinationLabel || null
        }
        if (destinationRanchID) {
          keptUpdatePayload.currentRanchID = destinationRanchID
        }

        await model.Calves.update(
          keptUpdatePayload,
          {
            where: { id: { [Op.in]: keptCalfIds } },
            transaction: t
          }
        )

        const keptCalves = await model.Calves.findAll({
          where: { id: { [Op.in]: keptCalfIds } },
          transaction: t
        })
        await Promise.all(
          keptCalves.map((calf) => (
            model.CalfLoads.update(
              { daysOnFeedAtShipment: this.calculateDaysOnFeedAtShipment(calf, effectiveDepartureDate) },
              {
                where: {
                  loadID: load.id,
                  calfID: calf.id
                },
                transaction: t
              }
            )
          ))
        )
      }

      await t.commit()
      return await this.findOne(id)
    } catch (error) {
      await t.rollback()
      console.error('❌ Update load transaction failed, rolled back:', error)
      throw error
    }
  }

  async updateCalfArrivalStatus(id, payload = {}) {
    const t = await sequelize.transaction()

    try {
      const loadId = this.toPositiveIntegerOrNull(id)
      const calfID = this.toPositiveIntegerOrNull(payload?.calfID)
      const actingRanchID = this.toPositiveIntegerOrNull(payload?.actingRanchID)
      const hasArrivalStatusField = Object.prototype.hasOwnProperty.call(payload || {}, 'arrivalStatus')
      const arrivalStatus = hasArrivalStatusField
        ? this.normalizeLoadCalfArrivalStatus(payload.arrivalStatus)
        : null

      if (!loadId) {
        throw boom.badRequest('Valid load id is required')
      }
      if (!calfID) {
        throw boom.badRequest('Valid calf id is required')
      }
      if (!actingRanchID) {
        throw boom.badRequest('Valid acting ranch id is required')
      }
      if (hasArrivalStatusField && payload.arrivalStatus !== null && String(payload.arrivalStatus).trim() !== '' && !arrivalStatus) {
        throw boom.badRequest('Invalid calf arrival status')
      }

      const load = await model.Loads.findByPk(loadId, { transaction: t })
      if (!load) throw boom.notFound('Load not found')

      const loadData = load.toJSON()
      if (!loadData.arrivalDate) {
        throw boom.badRequest('Calf arrival status can only be edited once the load is marked as arrived')
      }

      const originRanchID = this.toPositiveIntegerOrNull(loadData.originRanchID)
      const destinationRanchID = this.toPositiveIntegerOrNull(loadData.destinationRanchID)
      const hasDestinationRanch = Boolean(destinationRanchID)

      const canEditFromRanch = hasDestinationRanch
        ? (actingRanchID === originRanchID || actingRanchID === destinationRanchID)
        : (actingRanchID === originRanchID)
      if (!canEditFromRanch) {
        throw boom.forbidden(
          hasDestinationRanch
            ? 'Only origin or destination ranch can edit calf arrival status'
            : 'Only origin ranch can edit calf arrival status for custom destination loads'
        )
      }

      const calfLoad = await model.CalfLoads.findOne({
        where: {
          loadID: loadId,
          calfID,
        },
        transaction: t
      })
      if (!calfLoad) throw boom.notFound('Calf was not found in this load')

      const calf = await model.Calves.findByPk(calfID, { transaction: t })
      if (!calf) throw boom.notFound('Calf not found')

      const normalizedArrivalStatus = arrivalStatus || null
      const destinationLabel = String(loadData.destinationName || '').trim() || null
      const departureDateValue = loadData.departureDate || null
      const arrivalDateValue = loadData.arrivalDate || new Date()
      const safeOriginRanchID = originRanchID || this.toPositiveIntegerOrNull(calf.originRanchID)
      const safeDestinationRanchID = hasDestinationRanch
        ? (destinationRanchID || this.toPositiveIntegerOrNull(calf.currentRanchID))
        : null

      if (!safeOriginRanchID) {
        throw boom.badRequest('Origin ranch is required to resolve calf arrival status')
      }
      if (hasDestinationRanch && !safeDestinationRanchID) {
        throw boom.badRequest('Destination ranch is required to resolve calf arrival status')
      }

      const nextCalfChanges = {}
      if (normalizedArrivalStatus === 'doa') {
        nextCalfChanges.currentRanchID = hasDestinationRanch ? safeDestinationRanchID : safeOriginRanchID
        nextCalfChanges.status = 'deceased'
        nextCalfChanges.deathDate = arrivalDateValue
        nextCalfChanges.shippedOutDate = departureDateValue
        nextCalfChanges.shippedTo = destinationLabel
      } else if (normalizedArrivalStatus === 'not_in_load') {
        nextCalfChanges.currentRanchID = safeOriginRanchID
        nextCalfChanges.status = 'feeding'
        nextCalfChanges.deathDate = null
        nextCalfChanges.shippedOutDate = null
        nextCalfChanges.shippedTo = null
      } else {
        // In Load or Issue:
        // - Ranch-to-ranch: calf remains feeding at destination.
        // - Custom destination: calf remains shipped from origin.
        nextCalfChanges.currentRanchID = hasDestinationRanch ? safeDestinationRanchID : safeOriginRanchID
        nextCalfChanges.status = hasDestinationRanch ? 'feeding' : 'shipped'
        nextCalfChanges.deathDate = null
        nextCalfChanges.shippedOutDate = departureDateValue
        nextCalfChanges.shippedTo = destinationLabel
      }

      await calf.update(nextCalfChanges, { transaction: t })

      await calfLoad.update({
        arrivalStatus: normalizedArrivalStatus,
      }, { transaction: t })

      await t.commit()
      return await this.findOne(loadId)
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  async delete(id) {
    const t = await sequelize.transaction()

    try {
      const load = await model.Loads.findByPk(id, {
        include: [
          {
            model: model.CalfLoads,
            as: 'load',
            include: [{ model: model.Calves, as: 'calf' }]
          }
        ],
        transaction: t
      })

      if (!load) {
        throw new Error(`Load with id ${id} not found`)
      }

      const loadData = load.toJSON()
      const loadCalfRows = loadData.load || []
      const calfIds = [...new Set(loadCalfRows.map((row) => row.calfID).filter(Boolean))]

      if (calfIds.length > 0) {
        const movementRows = await model.CalfMovementHistory.findAll({
          where: {
            loadID: load.id,
            calfID: { [Op.in]: calfIds },
            movementType: 'load_transfer'
          },
          order: [['id', 'DESC']],
          transaction: t
        })

        const restoreStateByCalfId = new Map()
        movementRows.forEach((entry) => {
          if (!restoreStateByCalfId.has(entry.calfID)) {
            restoreStateByCalfId.set(entry.calfID, {
              status: entry.fromStatus || null,
              ranchID: entry.fromRanchID || null
            })
          }
        })

        const calves = await model.Calves.findAll({
          where: { id: { [Op.in]: calfIds } },
          transaction: t
        })

        const revertHistoryEntries = []

        for (const calf of calves) {
          const previous = restoreStateByCalfId.get(calf.id) || {}
          const restoredStatus = previous.status || 'feeding'
          const restoredRanchID = previous.ranchID || calf.originRanchID || calf.currentRanchID || null
          const fromStatus = calf.status || null
          const fromRanchID = calf.currentRanchID || null

          await calf.update(
            {
              status: restoredStatus,
              currentRanchID: restoredRanchID,
              shippedOutDate: null,
              shippedTo: null
            },
            { transaction: t }
          )

          revertHistoryEntries.push({
            calfID: calf.id,
            loadID: load.id,
            movementType: 'status_change',
            eventDate: new Date(),
            fromRanchID,
            toRanchID: restoredRanchID,
            fromStatus,
            toStatus: restoredStatus,
            notes: `Load #${load.id} deleted. Calf restored to previous status`
          })
        }

        if (revertHistoryEntries.length > 0) {
          await model.CalfMovementHistory.bulkCreate(revertHistoryEntries, { transaction: t })
        }
      }

      await model.CalfLoads.destroy({
        where: { loadID: load.id },
        transaction: t
      })

      await load.destroy({ transaction: t })
      await t.commit()
      return { id: Number(id) }
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  async findLoadbyRanch(id) {
    const ranchId = Number(id)
    const loads = await model.Loads.findAll({
      where: {
        [Op.or]: [
          { originRanchID: ranchId },
          { destinationRanchID: ranchId }
        ]
      },
      include: { all: true },
      order: [['departureDate', 'DESC']]
    })

    const result = loads.map(load => {
      const data = load.toJSON()
      const { createdAt, updatedAt } = this.getAuditTimestamps(load)
      const createdBy = this.getCreatedBy(load)
      const originRanchId = Number(data.originRanchID)
      const destinationRanchId = Number(data.destinationRanchID)
      const isSent = originRanchId === ranchId
      const isReceived = destinationRanchId === ranchId && originRanchId !== ranchId
      const direction = isReceived ? 'received' : (isSent ? 'sent' : 'sent')
      const counterpart = direction === 'received' ? data.origin : data.destination
      const counterpartName = counterpart?.name || data.destinationName || null
      const counterpartCity = counterpart?.city || null
      const counterpartState = counterpart?.state || null
      const status = this.getLoadStatus(data)

      return {
        ...data,
        createdAt,
        updatedAt,
        createdBy,
        status,
        direction,
        counterpartName,
        counterpartCity,
        counterpartState,
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
    calfIDs = [],
    originRanchID,
    destinationRanchID,
    destinationName,
    departureDate,
    arrivalDate,
    notes,
    trucking,
    createdBy
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
      const effectiveDepartureDate = departureDate || new Date()

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
        trucking,
        createdBy: createdBy || null
      }, { transaction: t })

      // If no filters → do NOT modify calves
      const normalizedCalfIds = this.normalizeIdentifierList(calfIDs)
        .map((value) => Number(value))
        .filter(Number.isFinite)
      const hasEids = Array.isArray(eids) && eids.length > 0
      const hasPrimary = Array.isArray(primaryIDs) && primaryIDs.length > 0
      const hasCalfIds = normalizedCalfIds.length > 0

      if (!hasCalfIds && !hasEids && !hasPrimary) {
        await t.commit()
        return load
      }

      // Build where and always scope candidates to origin ranch.
      const where = {
        status: { [Op.in]: ["feeding", "alive"] },
        currentRanchID: Number(originRanchID),
      }

      if (hasCalfIds) {
        where.id = { [Op.in]: normalizedCalfIds }
      } else if (hasEids && hasPrimary) {
        where[Op.or] = [
          { EID: eids.map((eid) => String(eid)) },
          { primaryID: primaryIDs },
        ]
      } else if (hasEids) {
        where.EID = eids.map((eid) => String(eid))
      } else if (hasPrimary) {
        where.primaryID = primaryIDs
      }

      // Find calves
      const calves = await model.Calves.findAll({ where, transaction: t })

      if (calves.length > 0) {
        const transferStatus = destinationRanchIdValue ? 'feeding' : 'shipped'

        // Update calves
        await Promise.all(
          calves.map(calf =>
            model.Calves.update(
              {
                currentRanchID: destinationRanchIdValue || calf.currentRanchID,
                status: transferStatus,
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
          loadID: load.id,
          daysOnFeedAtShipment: this.calculateDaysOnFeedAtShipment(calf, effectiveDepartureDate),
          arrivalStatus: null
        }))

        await model.CalfLoads.bulkCreate(historyEntries, { transaction: t })

        const movementEntries = calves.map(calf => ({
          calfID: calf.id,
          loadID: load.id,
          movementType: 'load_transfer',
          eventDate: effectiveDepartureDate,
          fromRanchID: originRanchID || calf.currentRanchID || null,
          toRanchID: destinationRanchIdValue || null,
          fromStatus: calf.status || 'feeding',
          toStatus: transferStatus,
          notes: notes || trucking || 'Transferred by load'
        }))

        await model.CalfMovementHistory.bulkCreate(movementEntries, { transaction: t })
      }

      await t.commit()
      return await this.findOne(load.id)

    } catch (error) {
      await t.rollback()
      console.error("❌ Transaction failed, rolled back:", error)
      throw error
    }
  }
}

module.exports = LoadsService
