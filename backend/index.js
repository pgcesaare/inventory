const express = require('express')
const cors = require('cors')
const { port } = require('./config/config').config
const routerApi = require('./routes')
const { logErrors, boomErrorHandler, ormErrorHandler, errorHandler, jsonSyntaxErrorHandler } = require('./middlewares/error.handler')



const app = express()
app.use(express.json())

app.use(cors({
  origin: "http://localhost:5173", 
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-master-data-mode"],
  credentials: true
}))

routerApi(app)
app.use(jsonSyntaxErrorHandler)
app.use(logErrors);
app.use(boomErrorHandler)   
app.use(ormErrorHandler)
app.use(errorHandler)


app.listen(port, () => {
    console.log(`App corriendo en el puerto ${port}`)
})
