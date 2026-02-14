const { Op, fn, col } = require('sequelize')
const { sequelize, model } = require('../db/libs/sequelize')

const toNullableNumber = (value) => {
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

const normalizeWeightCategories = (categories) => {
    if (!Array.isArray(categories)) return []

    return categories.map((item, index) => ({
        categoryKey: item?.key ? String(item.key) : null,
        minWeight: toNullableNumber(item?.min),
        maxWeight: toNullableNumber(item?.max),
        label: String(item?.label || `Category ${index + 1}`),
        description: item?.description === null || item?.description === undefined ? null : String(item.description),
        orderIndex: index,
    }))
}

const mapWeightCategoriesForApi = (rows) => rows
    .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0))
    .map((row) => ({
        key: row.categoryKey || null,
        min: row.minWeight === null || row.minWeight === undefined ? null : Number(row.minWeight),
        max: row.maxWeight === null || row.maxWeight === undefined ? null : Number(row.maxWeight),
        label: row.label || '',
        description: row.description || '',
    }))


class RanchesService {
    constructor(){
    }

    async attachWeightCategoriesToRanches(ranches) {
        if (!Array.isArray(ranches) || ranches.length === 0) return ranches

        const ranchIds = ranches.map((item) => Number(item.id)).filter(Number.isFinite)
        if (ranchIds.length === 0) return ranches

        const categoryRows = await model.RanchWeightCategories.findAll({
            where: { ranchID: { [Op.in]: ranchIds } },
            raw: true,
        })

        const byRanch = new Map()
        categoryRows.forEach((row) => {
            const ranchId = Number(row.ranchID)
            const current = byRanch.get(ranchId) || []
            current.push(row)
            byRanch.set(ranchId, current)
        })

        return ranches.map((item) => ({
            ...item,
            createdBy: item.createdBy || item.created_by || null,
            weightCategories: mapWeightCategoriesForApi(byRanch.get(Number(item.id)) || []),
        }))
    }
    
    async create(data) {
        const { weightCategories, ...ranchData } = data || {}
        const normalizedCategories = normalizeWeightCategories(weightCategories)

        const created = await sequelize.transaction(async (transaction) => {
            const newRanch = await model.Ranches.create({ ...ranchData }, { transaction })

            if (normalizedCategories.length > 0) {
                await model.RanchWeightCategories.bulkCreate(
                    normalizedCategories.map((item) => ({ ...item, ranchID: newRanch.id })),
                    { transaction }
                )
            }

            return newRanch
        })

        return this.findOne(created.id)

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

        const withAggregates = ranches.map((item) => {
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

        return this.attachWeightCategoriesToRanches(withAggregates)
    }

    
    async findOne(id){
        const ranch = await model.Ranches.findByPk(id, { raw: true })
        if (!ranch) return ranch
        const [withCategories] = await this.attachWeightCategoriesToRanches([ranch])
        return withCategories
    }

    async update(id, changes) {
        const ranchId = Number(id)
        const ranchModel = await model.Ranches.findByPk(ranchId)
        if (!ranchModel) return ranchModel

        const { weightCategories, ...ranchChanges } = changes || {}
        const normalizedCategories = normalizeWeightCategories(weightCategories)

        await sequelize.transaction(async (transaction) => {
            if (Object.keys(ranchChanges).length > 0) {
                await ranchModel.update(ranchChanges, { transaction })
            }

            if (Object.prototype.hasOwnProperty.call(changes || {}, 'weightCategories')) {
                await model.RanchWeightCategories.destroy({
                    where: { ranchID: ranchId },
                    transaction,
                })

                if (normalizedCategories.length > 0) {
                    await model.RanchWeightCategories.bulkCreate(
                        normalizedCategories.map((item) => ({ ...item, ranchID: ranchId })),
                        { transaction }
                    )
                }
            }
        })

        return this.findOne(ranchId)
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
