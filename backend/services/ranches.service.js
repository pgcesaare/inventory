const { Op, fn, col } = require('sequelize')
const boom = require('@hapi/boom')
const { sequelize, model } = require('../db/libs/sequelize')

const toNullableNumber = (value) => {
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

const normalizeBreedList = (value) => {
    if (!Array.isArray(value)) return []

    const unique = new Map()
    value.forEach((item) => {
        const normalized = String(item || '').trim()
        if (!normalized) return
        const key = normalized.toLowerCase()
        if (!unique.has(key)) unique.set(key, normalized)
    })

    return Array.from(unique.values())
}

const normalizeWeightCategories = (categories) => {
    if (!Array.isArray(categories)) return []

    return categories.map((item, index) => ({
        categoryKey: item?.key ? String(item.key) : null,
        minWeight: toNullableNumber(item?.min),
        maxWeight: toNullableNumber(item?.max),
        label: String(item?.label || `Category ${index + 1}`),
        description: item?.description === null || item?.description === undefined ? null : String(item.description),
        breeds: normalizeBreedList(item?.breeds),
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
        breeds: normalizeBreedList(row.breeds),
    }))

const toNullableDate = (value) => {
    if (value === null || value === undefined || value === '') return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toISOString().slice(0, 10)
}

const todayDateInput = () => new Date().toISOString().slice(0, 10)

const addDaysToDateInput = (dateInput, days) => {
    const raw = String(dateInput || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null

    const [year, month, day] = raw.split('-').map((part) => Number(part))
    const safeDate = new Date(Date.UTC(year, month - 1, day))
    if (Number.isNaN(safeDate.getTime())) return null

    safeDate.setUTCDate(safeDate.getUTCDate() + Number(days || 0))
    return safeDate.toISOString().slice(0, 10)
}

const applyRollingDateRanges = (periods) => {
    const source = Array.isArray(periods) ? periods : []
    if (source.length === 0) return source

    let previousStartDate = null
    const withAutoStarts = source.map((item) => {
        let startDate = toNullableDate(item?.startDate) || todayDateInput()
        if (previousStartDate && startDate <= previousStartDate) {
            startDate = addDaysToDateInput(previousStartDate, 1) || startDate
        }
        previousStartDate = startDate
        return {
            ...item,
            startDate,
        }
    })

    return withAutoStarts.map((item, index) => ({
        ...item,
        endDate: index === withAutoStarts.length - 1
            ? null
            : (addDaysToDateInput(withAutoStarts[index + 1]?.startDate, -1) || null),
    }))
}

const normalizeLayoutMode = (value) => (
    String(value || '').toLowerCase().trim() === 'weight' ? 'weight' : 'single'
)

const clonePlain = (value, fallback) => {
    try {
        return JSON.parse(JSON.stringify(value))
    } catch (error) {
        return fallback
    }
}

const normalizePriceSheetData = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return clonePlain(value, {})
}

const normalizePricePeriods = (periods) => {
    if (!Array.isArray(periods)) return []

    const normalized = periods.map((item, index) => ({
        periodKey: item?.key ? String(item.key) : null,
        label: String(item?.label || `Period ${index + 1}`),
        startDate: toNullableDate(item?.startDate),
        endDate: toNullableDate(item?.endDate),
        purchasePrice: toNullableNumber(item?.purchasePrice),
        sellPrice: toNullableNumber(item?.sellPrice),
        layoutMode: normalizeLayoutMode(item?.layoutMode),
        sheetData: normalizePriceSheetData(item?.sheetData),
        orderIndex: index,
    }))

    return applyRollingDateRanges(normalized)
}

const mapPricePeriodsForApi = (rows) => rows
    .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0))
    .map((row) => ({
        key: row.periodKey || null,
        label: row.label || '',
        startDate: row.startDate || null,
        endDate: row.endDate || null,
        purchasePrice: row.purchasePrice === null || row.purchasePrice === undefined ? null : Number(row.purchasePrice),
        sellPrice: row.sellPrice === null || row.sellPrice === undefined ? null : Number(row.sellPrice),
        layoutMode: normalizeLayoutMode(row.layoutMode),
        sheetData: normalizePriceSheetData(row.sheetData),
    }))

const buildDefaultPricePeriodRows = ({ hasWeightBrackets = false } = {}) => ([
    {
        periodKey: 'period_1',
        label: 'Period 1',
        startDate: todayDateInput(),
        endDate: null,
        purchasePrice: null,
        sellPrice: null,
        layoutMode: hasWeightBrackets ? 'weight' : 'single',
        sheetData: {},
        orderIndex: 0,
    }
])

const normalizeStateValue = (value) => String(value || '').trim()
const normalizeStateTemplateKey = (value) => normalizeStateValue(value).toLowerCase()
const normalizeRanchName = (value) => String(value || '').trim()

const mapWeightCategoryRowsForPersistence = (rows = []) => (
    rows.map((row, index) => ({
        categoryKey: row?.categoryKey || null,
        minWeight: toNullableNumber(row?.minWeight),
        maxWeight: toNullableNumber(row?.maxWeight),
        label: String(row?.label || `Category ${index + 1}`),
        description: row?.description === null || row?.description === undefined ? null : String(row.description),
        breeds: normalizeBreedList(row?.breeds),
        orderIndex: index,
    }))
)

const mapPricePeriodRowsForPersistence = (rows = []) => {
    const normalized = rows.map((row, index) => ({
        periodKey: row?.periodKey || null,
        label: String(row?.label || `Period ${index + 1}`),
        startDate: toNullableDate(row?.startDate),
        endDate: toNullableDate(row?.endDate),
        purchasePrice: toNullableNumber(row?.purchasePrice),
        sellPrice: toNullableNumber(row?.sellPrice),
        layoutMode: normalizeLayoutMode(row?.layoutMode),
        sheetData: normalizePriceSheetData(row?.sheetData),
        orderIndex: index,
    }))

    return applyRollingDateRanges(normalized)
}

class RanchesService {
    constructor(){
    }

    async ensureUniqueRanchName(name, { excludeRanchId = null, transaction } = {}) {
        const normalizedName = normalizeRanchName(name)
        if (!normalizedName) {
            throw boom.badRequest('Ranch name is required')
        }

        const where = {
            [Op.and]: [
                sequelize.where(fn('lower', col('name')), normalizedName.toLowerCase()),
            ],
        }
        if (Number.isFinite(Number(excludeRanchId))) {
            where.id = { [Op.ne]: Number(excludeRanchId) }
        }

        const existing = await model.Ranches.findOne({
            where,
            attributes: ['id', 'name'],
            transaction,
        })

        if (existing) {
            throw boom.conflict(`Ranch "${existing.name}" already exists.`)
        }

        return normalizedName
    }

    async replaceWeightCategoriesForRanch(ranchId, categories, transaction) {
        await model.RanchWeightCategories.destroy({
            where: { ranchID: ranchId },
            transaction,
        })

        if (!Array.isArray(categories) || categories.length === 0) return

        await model.RanchWeightCategories.bulkCreate(
            categories.map((item, index) => ({
                categoryKey: item?.categoryKey || null,
                minWeight: toNullableNumber(item?.minWeight),
                maxWeight: toNullableNumber(item?.maxWeight),
                label: String(item?.label || `Category ${index + 1}`),
                description: item?.description === null || item?.description === undefined ? null : String(item.description),
                breeds: normalizeBreedList(item?.breeds),
                orderIndex: index,
                ranchID: ranchId,
            })),
            { transaction }
        )
    }

    async replacePricePeriodsForRanch(ranchId, periods, transaction) {
        await model.RanchPricePeriods.destroy({
            where: { ranchID: ranchId },
            transaction,
        })

        if (!Array.isArray(periods) || periods.length === 0) return

        const normalized = mapPricePeriodRowsForPersistence(periods)
        if (normalized.length === 0) return

        await model.RanchPricePeriods.bulkCreate(
            normalized.map((item, index) => ({
                periodKey: item?.periodKey || null,
                label: String(item?.label || `Period ${index + 1}`),
                startDate: toNullableDate(item?.startDate),
                endDate: toNullableDate(item?.endDate),
                purchasePrice: toNullableNumber(item?.purchasePrice),
                sellPrice: toNullableNumber(item?.sellPrice),
                layoutMode: normalizeLayoutMode(item?.layoutMode),
                sheetData: normalizePriceSheetData(item?.sheetData),
                orderIndex: index,
                ranchID: ranchId,
            })),
            { transaction }
        )
    }

    async getStateTemplate(stateValue, { transaction, excludeRanchId } = {}) {
        const normalizedState = normalizeStateValue(stateValue)
        if (!normalizedState) return null

        const where = { state: { [Op.iLike]: normalizedState } }
        if (Number.isFinite(Number(excludeRanchId))) where.id = { [Op.ne]: Number(excludeRanchId) }

        const ranchCandidates = await model.Ranches.findAll({
            where,
            attributes: ['id'],
            order: [['id', 'ASC']],
            raw: true,
            transaction,
        })
        const ranchIds = ranchCandidates.map((item) => Number(item.id)).filter(Number.isFinite)
        if (ranchIds.length === 0) return null

        const [allWeightRows, allPriceRows] = await Promise.all([
            model.RanchWeightCategories.findAll({
                where: { ranchID: { [Op.in]: ranchIds } },
                order: [['orderIndex', 'ASC'], ['id', 'ASC']],
                raw: true,
                transaction,
            }),
            model.RanchPricePeriods.findAll({
                where: { ranchID: { [Op.in]: ranchIds } },
                order: [['orderIndex', 'ASC'], ['id', 'ASC']],
                raw: true,
                transaction,
            }),
        ])

        const weightRowsByRanch = new Map()
        allWeightRows.forEach((row) => {
            const ranchId = Number(row.ranchID)
            const current = weightRowsByRanch.get(ranchId) || []
            current.push(row)
            weightRowsByRanch.set(ranchId, current)
        })

        const priceRowsByRanch = new Map()
        allPriceRows.forEach((row) => {
            const ranchId = Number(row.ranchID)
            const current = priceRowsByRanch.get(ranchId) || []
            current.push(row)
            priceRowsByRanch.set(ranchId, current)
        })

        const templateRanchId = ranchIds.find((ranchId) => (
            (weightRowsByRanch.get(ranchId) || []).length > 0 ||
            (priceRowsByRanch.get(ranchId) || []).length > 0
        )) || ranchIds[0]

        const weightRows = weightRowsByRanch.get(templateRanchId) || []
        const priceRows = priceRowsByRanch.get(templateRanchId) || []

        const normalizedWeightCategories = mapWeightCategoryRowsForPersistence(weightRows)
        const normalizedPricePeriods = mapPricePeriodRowsForPersistence(priceRows)
        const hasWeightBrackets = normalizedWeightCategories.length > 0

        return {
            weightCategories: normalizedWeightCategories,
            pricePeriods: normalizedPricePeriods.length > 0
                ? normalizedPricePeriods
                : buildDefaultPricePeriodRows({ hasWeightBrackets }),
        }
    }

    async syncStateLayoutsFromSource({
        stateValue,
        sourceRanchId,
        includeWeightCategories = false,
        includePricePeriods = false,
        transaction,
    }) {
        const normalizedState = normalizeStateValue(stateValue)
        const numericSourceRanchId = Number(sourceRanchId)
        if (!normalizedState || !Number.isFinite(numericSourceRanchId)) return
        if (!includeWeightCategories && !includePricePeriods) return

        const siblingRanches = await model.Ranches.findAll({
            where: {
                state: { [Op.iLike]: normalizedState },
                id: { [Op.ne]: numericSourceRanchId },
            },
            attributes: ['id'],
            raw: true,
            transaction,
        })
        const siblingIds = siblingRanches.map((item) => Number(item.id)).filter(Number.isFinite)
        if (siblingIds.length === 0) return

        if (includeWeightCategories) {
            const sourceWeightRows = await model.RanchWeightCategories.findAll({
                where: { ranchID: numericSourceRanchId },
                order: [['orderIndex', 'ASC'], ['id', 'ASC']],
                raw: true,
                transaction,
            })
            const sourceWeight = mapWeightCategoryRowsForPersistence(sourceWeightRows)

            await model.RanchWeightCategories.destroy({
                where: { ranchID: { [Op.in]: siblingIds } },
                transaction,
            })

            if (sourceWeight.length > 0) {
                const records = siblingIds.flatMap((targetRanchId) => sourceWeight.map((item, index) => ({
                    categoryKey: item?.categoryKey || null,
                    minWeight: toNullableNumber(item?.minWeight),
                    maxWeight: toNullableNumber(item?.maxWeight),
                    label: String(item?.label || `Category ${index + 1}`),
                    description: item?.description === null || item?.description === undefined ? null : String(item.description),
                    breeds: normalizeBreedList(item?.breeds),
                    orderIndex: index,
                    ranchID: targetRanchId,
                })))
                await model.RanchWeightCategories.bulkCreate(records, { transaction })
            }
        }

        if (includePricePeriods) {
            const sourcePriceRows = await model.RanchPricePeriods.findAll({
                where: { ranchID: numericSourceRanchId },
                order: [['orderIndex', 'ASC'], ['id', 'ASC']],
                raw: true,
                transaction,
            })
            const sourcePeriods = mapPricePeriodRowsForPersistence(sourcePriceRows)

            await model.RanchPricePeriods.destroy({
                where: { ranchID: { [Op.in]: siblingIds } },
                transaction,
            })

            if (sourcePeriods.length > 0) {
                const records = siblingIds.flatMap((targetRanchId) => sourcePeriods.map((item, index) => ({
                    periodKey: item?.periodKey || null,
                    label: String(item?.label || `Period ${index + 1}`),
                    startDate: toNullableDate(item?.startDate),
                    endDate: toNullableDate(item?.endDate),
                    purchasePrice: toNullableNumber(item?.purchasePrice),
                    sellPrice: toNullableNumber(item?.sellPrice),
                    layoutMode: normalizeLayoutMode(item?.layoutMode),
                    sheetData: normalizePriceSheetData(item?.sheetData),
                    orderIndex: index,
                    ranchID: targetRanchId,
                })))
                await model.RanchPricePeriods.bulkCreate(records, { transaction })
            }
        }
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

        const stateTemplateRowsByState = new Map()
        const sortedRanches = [...ranches].sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
        sortedRanches.forEach((item) => {
            const stateKey = normalizeStateTemplateKey(item?.state)
            if (!stateKey || stateTemplateRowsByState.has(stateKey)) return

            const rows = byRanch.get(Number(item.id)) || []
            if (rows.length > 0) {
                stateTemplateRowsByState.set(stateKey, rows)
            }
        })

        return ranches.map((item) => ({
            ...item,
            createdBy: item.createdBy || item.created_by || null,
            weightCategories: (() => {
                const ownRows = byRanch.get(Number(item.id)) || []
                const stateKey = normalizeStateTemplateKey(item?.state)
                const fallbackRows = ownRows.length > 0
                    ? ownRows
                    : (stateTemplateRowsByState.get(stateKey) || [])
                return mapWeightCategoriesForApi(clonePlain(fallbackRows, []))
            })(),
        }))
    }

    async attachPricePeriodsToRanches(ranches) {
        if (!Array.isArray(ranches) || ranches.length === 0) return ranches

        const ranchIds = ranches.map((item) => Number(item.id)).filter(Number.isFinite)
        if (ranchIds.length === 0) return ranches

        const periodRows = await model.RanchPricePeriods.findAll({
            where: { ranchID: { [Op.in]: ranchIds } },
            raw: true,
        })

        const byRanch = new Map()
        periodRows.forEach((row) => {
            const ranchId = Number(row.ranchID)
            const current = byRanch.get(ranchId) || []
            current.push(row)
            byRanch.set(ranchId, current)
        })

        const stateTemplateRowsByState = new Map()
        const sortedRanches = [...ranches].sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
        sortedRanches.forEach((item) => {
            const stateKey = normalizeStateTemplateKey(item?.state)
            if (!stateKey || stateTemplateRowsByState.has(stateKey)) return

            const rows = byRanch.get(Number(item.id)) || []
            if (rows.length > 0) {
                stateTemplateRowsByState.set(stateKey, rows)
            }
        })

        return ranches.map((item) => ({
            ...item,
            createdBy: item.createdBy || item.created_by || null,
            pricePeriods: (() => {
                const ownRows = byRanch.get(Number(item.id)) || []
                const stateKey = normalizeStateTemplateKey(item?.state)
                const fallbackRows = ownRows.length > 0
                    ? ownRows
                    : (stateTemplateRowsByState.get(stateKey) || [])
                if (fallbackRows.length > 0) return mapPricePeriodsForApi(clonePlain(fallbackRows, []))
                const hasWeightBrackets = Array.isArray(item?.weightCategories) && item.weightCategories.length > 0
                return mapPricePeriodsForApi(buildDefaultPricePeriodRows({ hasWeightBrackets }))
            })(),
        }))
    }
    
    async create(data) {
        const { weightCategories, pricePeriods, ...ranchData } = data || {}
        const normalizedCategories = normalizeWeightCategories(weightCategories)
        const normalizedPricePeriods = normalizePricePeriods(pricePeriods)

        const created = await sequelize.transaction(async (transaction) => {
            const nextRanchData = { ...ranchData }
            nextRanchData.name = await this.ensureUniqueRanchName(nextRanchData.name, { transaction })

            const newRanch = await model.Ranches.create(nextRanchData, { transaction })
            const template = await this.getStateTemplate(newRanch.state, {
                transaction,
                excludeRanchId: newRanch.id,
            })
            const categoriesToPersist = template ? template.weightCategories : normalizedCategories
            const hasWeightBrackets = Array.isArray(categoriesToPersist) && categoriesToPersist.length > 0
            const periodsToPersist = template
                ? template.pricePeriods
                : (
                    normalizedPricePeriods.length > 0
                        ? normalizedPricePeriods
                        : buildDefaultPricePeriodRows({ hasWeightBrackets })
                )

            await this.replaceWeightCategoriesForRanch(newRanch.id, categoriesToPersist, transaction)
            await this.replacePricePeriodsForRanch(newRanch.id, periodsToPersist, transaction)

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

        const withCategories = await this.attachWeightCategoriesToRanches(withAggregates)
        return this.attachPricePeriodsToRanches(withCategories)
    }

    
    async findOne(id){
        const ranch = await model.Ranches.findByPk(id, { raw: true })
        if (!ranch) return ranch
        const [withCategories] = await this.attachWeightCategoriesToRanches([ranch])
        const [withPricePeriods] = await this.attachPricePeriodsToRanches([withCategories])
        return withPricePeriods
    }

    async update(id, changes) {
        const ranchId = Number(id)
        const ranchModel = await model.Ranches.findByPk(ranchId)
        if (!ranchModel) return ranchModel

        const { weightCategories, pricePeriods, ...ranchChanges } = changes || {}
        const normalizedCategories = normalizeWeightCategories(weightCategories)
        const normalizedPricePeriods = normalizePricePeriods(pricePeriods)
        const hasWeightCategoriesChange = Object.prototype.hasOwnProperty.call(changes || {}, 'weightCategories')
        const hasPricePeriodsChange = Object.prototype.hasOwnProperty.call(changes || {}, 'pricePeriods')
        const hasStateChange = Object.prototype.hasOwnProperty.call(changes || {}, 'state')
        const previousState = normalizeStateValue(ranchModel.state)

        await sequelize.transaction(async (transaction) => {
            if (Object.prototype.hasOwnProperty.call(ranchChanges, 'name')) {
                ranchChanges.name = await this.ensureUniqueRanchName(ranchChanges.name, {
                    excludeRanchId: ranchId,
                    transaction,
                })
            }

            if (Object.keys(ranchChanges).length > 0) {
                await ranchModel.update(ranchChanges, { transaction })
            }

            if (hasWeightCategoriesChange) {
                await this.replaceWeightCategoriesForRanch(ranchId, normalizedCategories, transaction)
            }

            if (hasPricePeriodsChange) {
                await this.replacePricePeriodsForRanch(ranchId, normalizedPricePeriods, transaction)
            }

            const nextState = normalizeStateValue(
                hasStateChange ? ranchChanges.state : ranchModel.state
            )

            if (hasWeightCategoriesChange || hasPricePeriodsChange) {
                await this.syncStateLayoutsFromSource({
                    stateValue: nextState,
                    sourceRanchId: ranchId,
                    includeWeightCategories: hasWeightCategoriesChange,
                    includePricePeriods: hasPricePeriodsChange,
                    transaction,
                })
            } else if (hasStateChange && nextState && previousState.toLowerCase() !== nextState.toLowerCase()) {
                const template = await this.getStateTemplate(nextState, {
                    transaction,
                    excludeRanchId: ranchId,
                })

                if (template) {
                    await this.replaceWeightCategoriesForRanch(ranchId, template.weightCategories, transaction)
                    await this.replacePricePeriodsForRanch(ranchId, template.pricePeriods, transaction)
                }
            }
        })

        return this.findOne(ranchId)
    }

    async delete(id) {
        const ranchId = Number(id)
        const ranchModel = await model.Ranches.findByPk(ranchId)
        if (!ranchModel) {
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

            await model.RanchWeightCategories.destroy({
                where: { ranchID: ranchId },
                transaction
            })
            await model.RanchPricePeriods.destroy({
                where: { ranchID: ranchId },
                transaction
            })

            await ranchModel.destroy({ transaction })
        })

        return { id: ranchId }
      }
}

module.exports = RanchesService
