const express = require('express')
const boom = require('@hapi/boom')
const validatorHandler = require('../middlewares/validator.handler')
const { createCalvesSchema, getCalvesSchema, updateCalvesSchema } = require('../schemas/calves.schema')
const CalvesService = require('../services/calves.service')
const moment = require('moment')
const XLSX = require('xlsx')
const { getCreatedByFromRequest } = require('../utils/authUser')
const { ensureBreedName, ensureSellerName } = require('../services/masterData.service')

const router = express.Router()

const service = new CalvesService()

const normalizeIncomingCalfPayload = (body, { forceCreationFields = false } = {}) => {
  const payload = { ...body }

  const normalizeStatus = (statusValue) => {
    const normalized = String(statusValue ?? '')
      .trim()
      .toLowerCase()
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')

    if (!normalized) return ''
    if (normalized === 'dead') return 'deceased'
    if (normalized === 'deceased') return 'deceased'
    if (normalized === 'feeding') return 'feeding'
    if (normalized === 'alive') return 'alive'
    if (normalized === 'sold') return 'sold'
    if (normalized === 'shipped' || normalized === 'shipped out') return 'shipped'
    return normalized
  }

  const normalizeSellStatus = (sellStatusValue) => {
    const normalized = String(sellStatusValue ?? '')
      .trim()
      .toLowerCase()
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')

    if (!normalized) return ''
    if (normalized === 'open') return 'open'
    if (normalized === 'sold') return 'sold'
    return normalized
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'backTag')) {
    payload.originalID = payload.backTag
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'dateIn')) {
    payload.placedDate = payload.dateIn
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'purchasePrice')) {
    payload.price = payload.purchasePrice
  }

  delete payload.backTag
  delete payload.dateIn
  delete payload.purchasePrice
  delete payload.daysOnFeed

  const normalizedStatus = normalizeStatus(payload.status)
  if (normalizedStatus) {
    payload.status = normalizedStatus
  } else {
    delete payload.status
  }

  const normalizedSellStatus = normalizeSellStatus(payload.sellStatus)
  if (normalizedSellStatus) {
    payload.sellStatus = normalizedSellStatus
  } else {
    delete payload.sellStatus
  }

  if (forceCreationFields && payload.status === undefined) {
    payload.status = 'feeding'
  }
  if (forceCreationFields && payload.sellStatus === undefined) {
    payload.sellStatus = payload.status === 'sold' ? 'sold' : 'open'
  }

  if (payload.status === 'sold' && payload.sellStatus === undefined) {
    payload.sellStatus = 'sold'
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key]
    }
  })

  return payload
}

const normalizeDateField = (value) => {
  if (value === undefined || value === null || value === "") return null

  let date
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value)
    if (!d) throw new Error('Invalid Excel serial date')
    date = moment.utc({ year: d.y, month: d.m - 1, day: d.d })
  } else if (typeof value === 'string') {
    date = moment.utc(value, ['MM/DD/YYYY', 'YYYY-MM-DD', moment.ISO_8601], true)
  } else if (value instanceof Date) {
    date = moment.utc(value)
  }

  if (!date || !date.isValid()) {
    throw new Error('Invalid date')
  }

  return date.startOf('day').toISOString()
}

const standardizeMasterFields = async (payload, options = {}) => {
  const allowMasterDataCreation = options.allowMasterDataCreation !== false
  const enableFuzzyMatch = options.enableFuzzyMatch === true
  const unresolvedFields = []
  const nextPayload = { ...payload }

  if (Object.prototype.hasOwnProperty.call(nextPayload, 'breed')) {
    const sourceBreed = nextPayload.breed
    const resolvedBreed = await ensureBreedName(sourceBreed, {
      allowCreate: allowMasterDataCreation,
      fuzzyMatch: enableFuzzyMatch,
    })
    if (!resolvedBreed && sourceBreed) unresolvedFields.push('breed')
    nextPayload.breed = resolvedBreed
  }

  if (Object.prototype.hasOwnProperty.call(nextPayload, 'seller')) {
    const sourceSeller = nextPayload.seller
    const resolvedSeller = await ensureSellerName(sourceSeller, {
      allowCreate: allowMasterDataCreation,
      fuzzyMatch: enableFuzzyMatch,
    })
    if (!resolvedSeller && sourceSeller) unresolvedFields.push('seller')
    nextPayload.seller = resolvedSeller
  }

  if (unresolvedFields.length > 0) {
    throw boom.badRequest(
      `Could not match ${unresolvedFields.join(' and ')} to existing catalog. Row moved to review.`
    )
  }

  return nextPayload
}

router.get('/',
  async (req, res, next) => {
    try {
     const calves = await service.findAll()
     res.json(calves)
    } catch (error) {
      next(error)
    }
  }
)

router.get('/ranch/:id', async (req, res, next) => {
  try {
    const calves = await service.findAllbyRanch(req.params.id)
    res.json(calves)
  } catch (error) {
    next(error)
  }
})

router.get('/inventory/:id', async (req, res, next) => {
  try{
    const calves = await service.findInventoryByRanch(req.params.id)
    res.json(calves)
  } catch (error) {
    next(error)
  }
})

router.get('/manage/:id', async (req, res, next) => {
  try {
    const calves = await service.findManageByRanch(req.params.id)
    res.json(calves)
  } catch (error) {
    next(error)
  }
})

router.get('/:id/movement-history',
  validatorHandler(getCalvesSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const history = await service.getMovementHistory(id)
      res.json(history)
    } catch (error) {
      next(error)
    }
  }
)


router.get('/:id',
  validatorHandler(getCalvesSchema, 'params'),
  async (req, res, next) => {
    try {
     const { id } = req.params
     const calf = await service.findOne(id)
     res.json(calf)
    } catch (error) {
      next(error)
    }
  }
)

router.post('/',
  validatorHandler(createCalvesSchema, 'body'),
  async (req, res, next) => {
    try {
      let body = normalizeIncomingCalfPayload(req.body, { forceCreationFields: true })
      const masterDataMode = String(req.get('x-master-data-mode') || '').trim().toLowerCase()
      const allowMasterDataCreation = masterDataMode !== 'catalog-only'
      const enableFuzzyMatch = masterDataMode === 'catalog-only'
      const fallbackCreatedBy = String(body?.createdBy || '').trim() || null
      const createdBy = getCreatedByFromRequest(req) || fallbackCreatedBy

      body.placedDate = normalizeDateField(body.placedDate)
      body.deathDate = normalizeDateField(body.deathDate)
      body.shippedOutDate = normalizeDateField(body.shippedOutDate)
      body.createdBy = createdBy
      body = await standardizeMasterFields(body, { allowMasterDataCreation, enableFuzzyMatch })

      const newCalf = await service.create(body)
      res.status(201).json(newCalf)
    } catch (error) {
      next(error)
    }
  }
)


router.patch('/:id',
  validatorHandler(getCalvesSchema, 'params'),
  validatorHandler(updateCalvesSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params
      let body = normalizeIncomingCalfPayload(req.body)
      if (body.placedDate !== undefined) body.placedDate = normalizeDateField(body.placedDate)
      if (body.deathDate !== undefined) body.deathDate = normalizeDateField(body.deathDate)
      if (body.shippedOutDate !== undefined) body.shippedOutDate = normalizeDateField(body.shippedOutDate)
      body = await standardizeMasterFields(body)
      res.status(201).json(await service.update(id, body))
    } catch (error) {
      next(error)
    }
  }
)

router.delete('/:id',
  validatorHandler(getCalvesSchema, 'params'),
async (req, res, next) => {
  try {
    const { id } = req.params
    await service.delete(id)
    res.status(201).json({id})
  } catch (error) {
    next(error)
  }
}
)

module.exports = router
