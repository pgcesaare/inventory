const { Op } = require('sequelize')
const { model } = require('../db/libs/sequelize')

class CalvesService {
    constructor(){
    }
    
    async create(data) {
        const normalizedStatus = String(data.status || 'feeding').toLowerCase()
        const normalizedSellStatus = String(
            data.sellStatus || (normalizedStatus === 'sold' ? 'sold' : 'open')
        ).toLowerCase()

        const createPayload = {
            ...data,
            status: normalizedStatus || 'feeding',
            sellStatus: normalizedSellStatus === 'sold' ? 'sold' : 'open',
        }

        const newCalf = await model.Calves.create(createPayload)

        await model.CalfMovementHistory.create({
            calfID: newCalf.id,
            movementType: 'intake',
            eventDate: newCalf.placedDate || new Date(),
            fromRanchID: null,
            toRanchID: newCalf.currentRanchID || newCalf.originRanchID || null,
            fromStatus: null,
            toStatus: newCalf.status,
            notes: 'Calf added into system'
        })

        return newCalf

    }

    async findAll() {
        const calves = await model.Calves.findAll()
        return calves
    }

    async findAllbyRanch(ranchId) {
        const calves = await model.Calves.findAll({
            where: { originRanchID: ranchId },
            include: { all: true }
        })
        return calves
    }

    async findInventoryByRanch(ranchId) {
        const data = await model.Calves.findAll({
            where: { 
                currentRanchID: ranchId,
                status: { [Op.in]: ['feeding', 'alive'] }
            },
            include: [{ all: true }]
        })

        return data
    }

    async findManageByRanch(ranchId) {
        const numericRanchId = Number(ranchId)
        const data = await model.Calves.findAll({
            where: {
                [Op.or]: [
                    { currentRanchID: numericRanchId },
                    { originRanchID: numericRanchId }
                ]
            },
            include: [{ all: true }],
            order: [['id', 'DESC']]
        })

        return data
    }
    
    async findOne(id){
        const calf = await model.Calves.findByPk(id, {
            include: [ {
                model: model.CalfLoads,
                as: 'calfLoads',
                include: [{
                    model: model.Loads,
                    as: 'load'
                }]
            }]
        }
        )
        return calf
    }

    async getMovementHistory(id) {
        const calf = await model.Calves.findByPk(id, { include: [{ all: true }] })

        if (!calf) return null

        const movementEntries = await model.CalfMovementHistory.findAll({
            where: { calfID: id },
            include: [
                {
                    model: model.Loads,
                    as: 'load',
                    include: [
                        { model: model.Ranches, as: 'origin' },
                        { model: model.Ranches, as: 'destination' }
                    ]
                },
                { model: model.Ranches, as: 'fromRanch' },
                { model: model.Ranches, as: 'toRanch' }
            ],
            order: [['eventDate', 'ASC'], ['id', 'ASC']]
        })

        const events = movementEntries
            .filter((entry) => {
                const movementType = String(entry?.movementType || '').toLowerCase()
                const hasLoadId = Number.isFinite(Number(entry?.loadID)) && Number(entry?.loadID) > 0
                const hasLoad = Boolean(entry?.load)

                // Hide pure status change entries in timeline.
                if (movementType === 'status_change') return false

                // Hide any transfer rows that do not point to an existing load.
                if (movementType === 'load_transfer' && (!hasLoadId || !hasLoad)) return false
                if (hasLoadId && !hasLoad) return false

                return true
            })
            .map((entry) => {
                const loadCreatedAt =
                    entry?.load?.createdAt ||
                    entry?.load?.created_at ||
                    (typeof entry?.load?.get === 'function' ? entry.load.get('created_at') : null) ||
                    (entry?.load?.dataValues ? entry.load.dataValues.created_at : null) ||
                    null

                return {
                    type: entry.movementType,
                    movementID: entry.id,
                    loadID: entry.loadID || null,
                    loadCreatedAt,
                    date: entry.eventDate || null,
                    departureDate: entry.load?.departureDate || null,
                    arrivalDate: entry.load?.arrivalDate || null,
                    fromRanch: entry.fromRanch
                        ? { id: entry.fromRanch.id, name: entry.fromRanch.name }
                        : entry.load?.origin
                            ? { id: entry.load.origin.id, name: entry.load.origin.name }
                            : null,
                    toRanch: entry.toRanch
                        ? { id: entry.toRanch.id, name: entry.toRanch.name }
                        : entry.load?.destination
                            ? { id: entry.load.destination.id, name: entry.load.destination.name }
                            : null,
                    fromStatus: entry.fromStatus || null,
                    toStatus: entry.toStatus || null,
                    notes: entry.notes || entry.load?.notes || null
                }
            })
            .filter(Boolean)

        if (events.length === 0) {
            events.push({
                type: 'intake',
                movementID: null,
                loadID: null,
                date: calf.placedDate || null,
                departureDate: null,
                arrivalDate: null,
                fromRanch: null,
                toRanch: calf.currentRanch
                    ? { id: calf.currentRanch.id, name: calf.currentRanch.name }
                    : null,
                fromStatus: null,
                toStatus: calf.status || null,
                notes: 'Initial record'
            })
        }

        return {
            calf: {
                id: calf.id,
                primaryID: calf.primaryID,
                EID: calf.EID,
                backTag: calf.originalID,
                dateIn: calf.placedDate,
                breed: calf.breed,
                sex: calf.sex,
                weight: calf.weight,
                purchasePrice: calf.price,
                sellPrice: calf.sellPrice,
                seller: calf.seller,
                dairy: calf.dairy,
                condition: calf.condition,
                status: calf.status,
                sellStatus: calf.sellStatus || 'open',
                proteinLevel: calf.proteinLevel,
                proteinTest: calf.proteinTest,
                deathDate: calf.deathDate,
                shippedOutDate: calf.shippedOutDate,
                shippedTo: calf.shippedTo,
                preDaysOnFeed: calf.preDaysOnFeed,
                daysOnFeed: calf.daysOnFeed,
                originRanchID: calf.originRanchID,
                currentRanchID: calf.currentRanchID,
                createdBy:
                    calf.createdBy ||
                    calf.created_by ||
                    (typeof calf.get === 'function' ? calf.get('created_by') : null) ||
                    (calf.dataValues ? calf.dataValues.created_by : null) ||
                    null,
                createdAt:
                    calf.createdAt ||
                    calf.created_at ||
                    (typeof calf.get === 'function' ? calf.get('created_at') : null) ||
                    (calf.dataValues ? calf.dataValues.created_at : null) ||
                    null,
                updatedAt:
                    calf.updatedAt ||
                    calf.updated_at ||
                    (typeof calf.get === 'function' ? calf.get('updated_at') : null) ||
                    (calf.dataValues ? calf.dataValues.updated_at : null) ||
                    null
            },
            events
        }
    }

    async update(id, changes) {
        const calf = await model.Calves.findByPk(id)
        if (!calf) {
            throw new Error(`Calf with id ${id} not found`)
        }
        const previousState = calf.toJSON()
        const nextChanges = { ...changes }

        if (nextChanges.sellStatus !== undefined && nextChanges.sellStatus !== null && nextChanges.sellStatus !== '') {
            const normalizedSellStatus = String(nextChanges.sellStatus).toLowerCase().trim()
            nextChanges.sellStatus = normalizedSellStatus === 'sold' ? 'sold' : 'open'
        }

        // If a death date is provided, keep status consistent with a deceased calf.
        if (nextChanges.deathDate !== undefined && nextChanges.deathDate !== null && nextChanges.deathDate !== '') {
            nextChanges.status = 'deceased'
        }

        if (String(nextChanges.status || '').toLowerCase() === 'sold' && nextChanges.sellStatus === undefined) {
            nextChanges.sellStatus = 'sold'
        }

        const updated = await calf.update(nextChanges)

        const movementEvents = []

        if (nextChanges.currentRanchID && Number(nextChanges.currentRanchID) !== Number(previousState.currentRanchID)) {
            movementEvents.push({
                calfID: calf.id,
                movementType: 'ranch_transfer',
                eventDate: nextChanges.shippedOutDate || new Date(),
                fromRanchID: previousState.currentRanchID || null,
                toRanchID: nextChanges.currentRanchID || null,
                fromStatus: previousState.status || null,
                toStatus: nextChanges.status || previousState.status || null,
                notes: 'Current ranch updated'
            })
        }

        if (nextChanges.status && nextChanges.status !== previousState.status) {
            movementEvents.push({
                calfID: calf.id,
                movementType: nextChanges.status === 'deceased' ? 'death' : nextChanges.status === 'shipped' ? 'shipped_out' : 'status_change',
                eventDate: nextChanges.deathDate || nextChanges.shippedOutDate || new Date(),
                fromRanchID: previousState.currentRanchID || null,
                toRanchID: nextChanges.currentRanchID || previousState.currentRanchID || null,
                fromStatus: previousState.status || null,
                toStatus: nextChanges.status || null,
                notes: `Status changed from ${previousState.status || '-'} to ${nextChanges.status}`
            })
        }

        if (movementEvents.length > 0) {
            await model.CalfMovementHistory.bulkCreate(movementEvents)
        }

        return updated
    }

    async delete(id) {
        const calf = await model.Calves.findByPk(id)
        if (!calf) {
            throw new Error(`Calf with id ${id} not found`)
        }
        await calf.destroy()
        return { id }
      }
}

module.exports = CalvesService
