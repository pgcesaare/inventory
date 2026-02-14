const express = require('express')
const { createLoadsSchema, getLoadsSchema, updateLoadsSchema } = require('../schemas/loads.schema')
const validatorHandler = require('../middlewares/validator.handler')
const LoadsService = require('../services/loads.service')
const { getCreatedByFromRequest } = require('../utils/authUser')

const router = express.Router()

const service = new LoadsService()

router.get('/',
  async (req, res, next) => {
    try {
     const items = await service.findAll()
     res.json(items)
    } catch (error) {
      next(error)
    }
  }
)


router.get('/:id',
  validatorHandler(getLoadsSchema, 'params'),
  async (req, res, next) => {
    try {
     const { id } = req.params
     const item = await service.findOne(id)
     res.json(item)
    } catch (error) {
      next(error)
    }
  }
)

router.get('/ranch/:id',
  validatorHandler(getLoadsSchema, 'params'),
  async (req, res, next) => {
    try {
     const { id } = req.params
     const item = await service.findLoadbyRanch(id)
     res.json(item)
    } catch (error) {
      next(error)
    }
  }
)




router.post('/',
  validatorHandler(createLoadsSchema, 'body'),
  async (req, res, next) => {
    try {
      const fallbackCreatedBy = String(req.body?.createdBy || '').trim() || null
      const createdBy = getCreatedByFromRequest(req) || fallbackCreatedBy
      const load = await service.createLoad({
        ...req.body,
        createdBy,
      })
      res.status(201).json(load)
    } catch (error) {
      next(error)
    }
  }
)

router.patch('/:id',
  validatorHandler(getLoadsSchema, 'params'),
  validatorHandler(updateLoadsSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const body = req.body
      res.status(201).json(await service.update(id, body))
    } catch (error) {
      next(error)
    }
  }
)

router.delete('/:id',
  validatorHandler(getLoadsSchema, 'params'),
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
