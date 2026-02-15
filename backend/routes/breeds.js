const express = require('express')
const validatorHandler = require('../middlewares/validator.handler')
const { getBreedSchema, createBreedSchema, updateBreedSchema } = require('../schemas/breeds.schema')
const BreedsService = require('../services/breeds.service')

const router = express.Router()
const service = new BreedsService()

router.get('/', async (req, res, next) => {
  try {
    const items = await service.findAll()
    res.json(items)
  } catch (error) {
    next(error)
  }
})

router.get('/:id',
  validatorHandler(getBreedSchema, 'params'),
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
  validatorHandler(createBreedSchema, 'body'),
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
  validatorHandler(getBreedSchema, 'params'),
  validatorHandler(updateBreedSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const item = await service.update(id, req.body)
      res.status(200).json(item)
    } catch (error) {
      next(error)
    }
  }
)

router.delete('/:id',
  validatorHandler(getBreedSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params
      await service.delete(id)
      res.status(200).json({ id: Number(id) })
    } catch (error) {
      next(error)
    }
  }
)

module.exports = router
