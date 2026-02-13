const { Op } = require('sequelize')
const { model } = require('../db/libs/sequelize')

class CalvesService {
    constructor(){
    }
    
    async create(data) {
        const createPayload = {
            ...data,
            status: data.status || 'feeding'
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
            .map((entry) => {
                return {
                    type: entry.movementType,
                    movementID: entry.id,
                    loadID: entry.loadID || null,
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
                status: calf.status,
                proteinLevel: calf.proteinLevel,
                proteinTest: calf.proteinTest,
                deathDate: calf.deathDate,
                shippedOutDate: calf.shippedOutDate,
                shippedTo: calf.shippedTo,
                preDaysOnFeed: calf.preDaysOnFeed,
                daysOnFeed: calf.daysOnFeed,
                originRanchID: calf.originRanchID,
                currentRanchID: calf.currentRanchID,
                createdAt: calf.createdAt || null,
                updatedAt: calf.updatedAt || null
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

        // If a death date is provided, keep status consistent with a deceased calf.
        if (nextChanges.deathDate !== undefined && nextChanges.deathDate !== null && nextChanges.deathDate !== '') {
            nextChanges.status = 'deceased'
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
