const { Op, fn, col } = require('sequelize')
const { sequelize, model } = require('../db/libs/sequelize')


class RanchesService {
    constructor(){
    }
    
    async create(data) {
            
        const newRanch = await model.Ranches.create({...data})
        return newRanch

    }

    async findAll() {
        const ranches = await model.Ranches.findAll({ raw: true })
        if (!ranches.length) return ranches

        const ranchIds = ranches.map((item) => item.id)

        const inventoryCounts = await model.Calves.findAll({
            attributes: [
                'currentRanchID',
                [fn('COUNT', col('id')), 'inventoryCount']
            ],
            where: {
                currentRanchID: { [Op.in]: ranchIds },
                status: { [Op.in]: ['feeding', 'alive'] }
            },
            group: ['currentRanchID'],
            raw: true
        })

        const activeLoads = await model.Loads.findAll({
            attributes: [
                'originRanchID',
                [fn('COUNT', col('id')), 'activeLoads']
            ],
            where: {
                originRanchID: { [Op.in]: ranchIds },
                arrivalDate: null
            },
            group: ['originRanchID'],
            raw: true
        })

        const lastPlacedDates = await model.Calves.findAll({
            attributes: [
                'currentRanchID',
                [fn('MAX', col('placed_date')), 'lastPlacedDate']
            ],
            where: { currentRanchID: { [Op.in]: ranchIds } },
            group: ['currentRanchID'],
            raw: true
        })

        const toMovementDates = await model.CalfMovementHistory.findAll({
            attributes: [
                'toRanchID',
                [fn('MAX', col('event_date')), 'lastMovementDate']
            ],
            where: { toRanchID: { [Op.in]: ranchIds } },
            group: ['toRanchID'],
            raw: true
        })

        const fromMovementDates = await model.CalfMovementHistory.findAll({
            attributes: [
                'fromRanchID',
                [fn('MAX', col('event_date')), 'lastMovementDate']
            ],
            where: { fromRanchID: { [Op.in]: ranchIds } },
            group: ['fromRanchID'],
            raw: true
        })

        const inventoryMap = new Map(inventoryCounts.map((item) => [Number(item.currentRanchID), Number(item.inventoryCount || 0)]))
        const activeLoadsMap = new Map(activeLoads.map((item) => [Number(item.originRanchID), Number(item.activeLoads || 0)]))

        const lastUpdatedMap = new Map()
        const registerDate = (ranchId, value) => {
            if (!ranchId || !value) return
            const parsed = new Date(value)
            if (Number.isNaN(parsed.getTime())) return
            const prev = lastUpdatedMap.get(ranchId)
            if (!prev || parsed > prev) {
                lastUpdatedMap.set(ranchId, parsed)
            }
        }

        lastPlacedDates.forEach((item) => registerDate(Number(item.currentRanchID), item.lastPlacedDate))
        toMovementDates.forEach((item) => registerDate(Number(item.toRanchID), item.lastMovementDate))
        fromMovementDates.forEach((item) => registerDate(Number(item.fromRanchID), item.lastMovementDate))

        return ranches.map((item) => {
            const totalCattle = inventoryMap.get(Number(item.id)) || 0
            const activeLots = activeLoadsMap.get(Number(item.id)) || 0
            const lastUpdated = lastUpdatedMap.get(Number(item.id))
            return {
                ...item,
                totalCattle,
                activeLots,
                managerName: item.manager || null,
                status: totalCattle > 0 ? 'Active' : 'Inactive',
                lastUpdated: lastUpdated ? lastUpdated.toISOString() : null
            }
        })
    }

    
    async findOne(id){
        const Ranch = await model.Ranches.findByPk(id)
        return Ranch
    }

    async update(id, changes) {
        const model = await this.findOne(id)
        const rta = await model.update(changes)
        return rta
    }

    async delete(id) {
        const ranchId = Number(id)
        const ranch = await this.findOne(ranchId)
        if (!ranch) {
            throw new Error(`Ranch with id ${ranchId} not found`)
        }

        await sequelize.transaction(async (transaction) => {
            // Keep movement history rows but detach deleted ranch references.
            await model.CalfMovementHistory.update(
                { fromRanchID: null },
                { where: { fromRanchID: ranchId }, transaction }
            )
            await model.CalfMovementHistory.update(
                { toRanchID: null },
                { where: { toRanchID: ranchId }, transaction }
            )

            // Remove dependent operational data tied to this ranch.
            await model.Calves.destroy({
                where: {
                    [Op.or]: [
                        { currentRanchID: ranchId },
                        { originRanchID: ranchId }
                    ]
                },
                transaction
            })

            await model.Loads.destroy({
                where: {
                    [Op.or]: [
                        { originRanchID: ranchId },
                        { destinationRanchID: ranchId }
                    ]
                },
                transaction
            })

            await ranch.destroy({ transaction })
        })

        return { id: ranchId }
      }
}

module.exports = RanchesService
