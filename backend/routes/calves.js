const express = require('express')
const validatorHandler = require('../middlewares/validator.handler')
const { createCalvesSchema, getCalvesSchema, updateCalvesSchema } = require('../schemas/calves.schema')
const CalvesService = require('../services/calves.service')
const moment = require('moment')
const XLSX = require('xlsx')

const router = express.Router()

const service = new CalvesService()

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
      const body = req.body

      if (body.placedDate !== undefined && body.placedDate !== null) {
        let date;

        // Si viene como número (Excel serial)
        if (typeof body.placedDate === 'number') {
          const d = XLSX.SSF.parse_date_code(body.placedDate);
          if (!d) throw new Error('Invalid Excel serial date');
          date = moment.utc({ year: d.y, month: d.m - 1, day: d.d });
        }
        // Si viene como string
        else if (typeof body.placedDate === 'string') {
          date = moment.utc(body.placedDate, ['MM/DD/YYYY','YYYY-MM-DD', moment.ISO_8601], true);
        }

        if (!date || !date.isValid()) {
          throw new Error('Invalid date');
        }

        body.placedDate = date.startOf('day').toISOString();
      }

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
      const body = req.body
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