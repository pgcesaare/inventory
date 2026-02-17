const Joi = require('joi')

const id = Joi.number().integer()
const primaryID = Joi.string()
const EID = Joi.string()
const backTag = Joi.string()
const dateIn = Joi.date()
const breed = Joi.string()
const sex = Joi.string().valid('bull', 'heifer', 'steer', 'freeMartin').insensitive().trim()
const weight = Joi.number().precision(2)
const purchasePrice = Joi.number().precision(2)
const sellPrice = Joi.number().precision(2)
const currentRanchID = Joi.number().integer()
const originRanchID = Joi.number().integer()
const seller = Joi.string()
const dairy = Joi.string()
const condition = Joi.string()
const status = Joi.string().valid('feeding','sold', 'alive', 'deceased', 'shipped').insensitive().trim()
const proteinLevel = Joi.number().precision(2)
const proteinTest = Joi.string()
const deathDate = Joi.date()
const shippedOutDate = Joi.date()
const shippedTo = Joi.string()
const preDaysOnFeed = Joi.number().integer()
const daysOnFeed = Joi.number().integer()
const createdBy = Joi.string()

const createCalvesSchema = Joi.object({

    primaryID: primaryID.required(),
    EID: EID.allow(null, ''),
    backTag: backTag.allow(null, ''),
    dateIn: dateIn.required(),
    breed: breed.required(),
    sex: sex.required(),
    weight: weight.allow(null),
    purchasePrice: purchasePrice.allow(null),
    sellPrice: sellPrice.allow(null),
    seller: seller.required(),
    dairy: dairy.allow(null, ''),
    condition: condition.allow(null, ''),
    status: status.default('feeding'),
    proteinLevel: proteinLevel.allow(null),
    proteinTest: proteinTest.allow(null, ''),
    deathDate: deathDate.allow(null, ''),
    shippedOutDate: shippedOutDate.allow(null, ''),
    shippedTo: shippedTo.allow(null, ''),
    preDaysOnFeed: preDaysOnFeed.allow(null),
    daysOnFeed: daysOnFeed.allow(null),
    createdBy: createdBy.allow(null, ''),
    currentRanchID: currentRanchID.required(),
    originRanchID: originRanchID.allow(null),

})

const getCalvesSchema = Joi.object({

    id: id,
    primaryID: primaryID,
    EID: EID,
    backTag: backTag

})

const updateCalvesSchema = Joi.object({
    
    primaryID: primaryID,
    EID: EID.allow(null, ''),
    backTag: backTag,
    dateIn: dateIn,
    breed: breed,
    sex: sex,
    weight: weight,
    purchasePrice: purchasePrice,
    sellPrice: sellPrice.allow(null),
    seller: seller,
    dairy: dairy,
    condition: condition.allow(null, ''),
    status: status,
    proteinLevel: proteinLevel,
    proteinTest: proteinTest,
    deathDate: deathDate.allow(null, ''),
    shippedOutDate: shippedOutDate.allow(null, ''),
    shippedTo: shippedTo.allow(null, ''),
    preDaysOnFeed: preDaysOnFeed,
    daysOnFeed: daysOnFeed,
    currentRanchID: currentRanchID,
    originRanchID: originRanchID,

})

module.exports = { createCalvesSchema, getCalvesSchema, updateCalvesSchema }
