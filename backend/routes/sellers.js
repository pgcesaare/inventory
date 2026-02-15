const express = require('express')
const validatorHandler = require('../middlewares/validator.handler')
const { getSellerSchema, createSellerSchema, updateSellerSchema } = require('../schemas/sellers.schema')
const SellersService = require('../services/sellers.service')

const router = express.Router()
const service = new SellersService()

router.get('/', async (req, res, next) => {
  try {
    const items = await service.findAll()
    res.json(items)
  } catch (error) {
    next(error)
  }
})

router.get('/:id',
  validatorHandler(getSellerSchema, 'params'),
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
  validatorHandler(createSellerSchema, 'body'),
  async (req, res, next) => {
    try {
      const item = await service.create(req.body)
      res.status(201).json(item)
    } catch (error) {
      next(error)
    }
  }
)

router.patch('/:id',
  validatorHandler(getSellerSchema, 'params'),
  validatorHandler(updateSellerSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const item = await service.update(id, req.body)
      res.status(201).json(item)
    } catch (error) {
      next(error)
    }
  }
)

router.delete('/:id',
  validatorHandler(getSellerSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params
      await service.delete(id)
      res.status(201).json({ id: Number(id) })
    } catch (error) {
      next(error)
    }
  }
)

module.exports = router
