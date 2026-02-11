const express = require('express')
const { createRanchesSchema, getRanchesSchema, updateRanchesSchema } = require('../schemas/ranches.schema')
const validatorHandler = require('../middlewares/validator.handler')
const RanchesService = require('../services/ranches.service')

const router = express.Router()

const service = new RanchesService()

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
  validatorHandler(getRanchesSchema, 'params'),
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

router.post('/',
  validatorHandler(createRanchesSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body
      const newitem = await service.create(body)
      res.status(201).json(newitem)
    } catch (error) {
      next(error)
    }
  }
)

router.patch('/:id',
  validatorHandler(getRanchesSchema, 'params'),
  validatorHandler(updateRanchesSchema, 'body'),
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
  validatorHandler(getRanchesSchema, 'params'),
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