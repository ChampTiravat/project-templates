const dotenvSafe = require('dotenv-safe')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const { httpStatus } = require('./constants')
const { extractUserFromToken } = require('./middlewares')

// =========================================================================
// Loading environment configurations.
// =========================================================================
dotenvSafe.config()
const {
  NODE_ENV,
  SERVER_HOST,
  SERVER_PORT,

  CLIENT_WHITELIST,

  MAIN_DB_HOST,
  MAIN_DB_PORT,
  MAIN_DB_DBNAME,
  MAIN_DB_USERNAME,
  MAIN_DB_PASSWORD,
} = process.env

const isDevMode = NODE_ENV === 'development'

mongoose.connect(`mongodb://${MAIN_DB_HOST}:${MAIN_DB_PORT}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  user: MAIN_DB_USERNAME,
  pass: MAIN_DB_PASSWORD,
  dbName: MAIN_DB_DBNAME,
  autoIndex: isDevMode,
})

const db = mongoose.connection

db.on('error', (err) => {
  console.error(err)
})

db.once('open', function () {
  const app = express()

  const CORSConfig = {
    methods: 'GET,HEAD,PATCH,POST,DELETE',
    origin: isDevMode ? '*' : CLIENT_WHITELIST.split(','),
  }

  const httpLogStream = fs.createWriteStream(
    path.join(__dirname, `${NODE_ENV}_http_access.log`),
    { flags: 'a' },
  )

  // =========================================================================
  // Applying HTTP middlewares.
  // =========================================================================
  app.use(cors(CORSConfig))
  app.use(morgan(isDevMode ? 'combined' : 'combined', { stream: httpLogStream }))
  app.use(morgan(isDevMode ? 'combined' : 'combined'))
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())
  app.use(extractUserFromToken)

  // =========================================================================
  // HTTP routes for API version 1.
  // =========================================================================
  const { userRouter } = require('./http-handlers')

  app.use('/api/v1/users', userRouter)

  // =========================================================================
  // Healthcheck path for service discovery.
  // =========================================================================
  app.get('/healthcheck', async (req, res) => {
    return res.status(httpStatus.STATUS_OK).json({ data: 'ok' })
  })

  // =========================================================================
  // Initiate HTTP server.
  // =========================================================================
  app.listen(Number(SERVER_PORT), SERVER_HOST, (err) => {
    if (err) {
      throw err
    } else {
      const srvENV = NODE_ENV.toUpperCase()
      console.log(`
[${srvENV}] Database connected to:\t\t mongodb://${MAIN_DB_HOST}:${MAIN_DB_PORT}
[${srvENV}] Server started at:\t\t http://${SERVER_HOST}:${SERVER_PORT}
[${srvENV}] Health Check API at:\t\t http://${SERVER_HOST}:${SERVER_PORT}/healthcheck
[${srvENV}] Whitelisted origin(s):\t\t ${CORSConfig.origin}
[${srvENV}] Whitelisted HTTP method(s):\t ${CORSConfig.methods}
`) // end console.log()
    } // end if/else
  }) // end app.listen()
}) // end db.once('open')
