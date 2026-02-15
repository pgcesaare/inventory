const express = require('express')
const { jwtCheck } = require('../middlewares/auth.handler')
const calvesRouter = require('./calves')
const ranchesRouter = require('./ranches')
const loadsRouter = require('./loads')
const uploadRouter = require('./upload')
const breedsRouter = require('./breeds')
const sellersRouter = require('./sellers')

function routerApi(app){

    const router = express.Router()
    
    app.use('/api/v1', router)
    
    router.use(jwtCheck)

    router.use('/calves', calvesRouter)
    router.use('/ranches', ranchesRouter)
    router.use('/loads', loadsRouter)
    router.use('/upload', uploadRouter)
    router.use('/breeds', breedsRouter)
    router.use('/sellers', sellersRouter)
    
}

module.exports = routerApi
