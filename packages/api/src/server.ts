import axios from 'axios'
import fs from 'fs-extra'
import path from 'path'
import express from 'express'
import helmet from 'helmet'
import cors, { CorsOptions } from 'cors'
import mongoose from 'mongoose'
import Config from './models/configModel'
import { createRouter } from './api'
import { Logger, configLoader } from '@cloud-carbon-footprint/common'
import { MongoDbCacheManager } from '@cloud-carbon-footprint/app'
import swaggerDocs from './utils/swagger'
import auth from './utils/auth'

const port = process.env.PORT || 4000
const httpApp = express()
const serverLogger = new Logger('Server')

const LOCAL_CREDENTIALS_PATH = path.join(__dirname, 'service_account.json')

/**
 * Downloads a file from the given URL and saves it locally.
 */
const downloadCredentials = async (url: string) => {
  try {
    console.log(`Downloading credentials from ${url}...`)
    const response = await axios.get(url, { responseType: 'stream' })
    const writer = fs.createWriteStream(LOCAL_CREDENTIALS_PATH)

    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  } catch (error) {
    console.error('Failed to download credentials:', error)
    process.exit(1)
  }
}

/**
 * Loads the tenant configuration from MongoDB.
 */
const loadConfig = async (email: string) => {
  const config = await Config.findOne({ email })
  if (!config) {
    throw new Error(`Configuration for tenant '${email}' not found`)
  }
  return config
}

const startServer = async () => {
  const email = process.env.email || 'ses@mail.com'
  const config = await loadConfig(email)

  // Download the credentials file using the URL stored in the Mongo document
  if (!config.GOOGLE_APPLICATION_CREDENTIALS_URL) {
    throw new Error(`GOOGLE_APPLICATION_CREDENTIALS_URL missing for tenant '${email}'`)
  }
  await downloadCredentials(config.GOOGLE_APPLICATION_CREDENTIALS_URL)
  
  // Set the credentials environment variable to the local file
  process.env.GOOGLE_APPLICATION_CREDENTIALS = LOCAL_CREDENTIALS_PATH
  console.log(`GOOGLE_APPLICATION_CREDENTIALS set to ${LOCAL_CREDENTIALS_PATH}`)

  // Set additional environment variables from MongoDB config
  process.env.GCP_USE_BILLING_DATA = config.GCP_USE_BILLING_DATA.toString()
  process.env.GCP_USE_CARBON_FREE_ENERGY_PERCENTAGE = config.GCP_USE_CARBON_FREE_ENERGY_PERCENTAGE.toString()
  process.env.GCP_BILLING_PROJECT_ID = config.GCP_BILLING_PROJECT_ID
  process.env.GCP_BILLING_PROJECT_NAME = config.GCP_BILLING_PROJECT_NAME
  process.env.GCP_BIG_QUERY_TABLE = config.GCP_BIG_QUERY_TABLE

  // Middleware
  if (process.env.NODE_ENV === 'production') {
    httpApp.use(auth)
  }
  httpApp.use(helmet())

  if (configLoader()?.CACHE_MODE === 'MONGODB') {
    MongoDbCacheManager.createDbConnection()
  }

  if (process.env.ENABLE_CORS) {
    const corsOptions: CorsOptions = {
      optionsSuccessStatus: 200,
    }
    if (process.env.CORS_ALLOW_ORIGIN) {
      serverLogger.info(
        'Allowing CORS requests from origin(s) ' + process.env.CORS_ALLOW_ORIGIN,
      )
      corsOptions.origin = process.env.CORS_ALLOW_ORIGIN.split(',')
    }
    httpApp.use(cors(corsOptions))
  }

  httpApp.use('/api', createRouter())

  httpApp.listen(port, () => {
    serverLogger.info(`Cloud Carbon Footprint Server listening at http://localhost:${port}`)
    swaggerDocs(httpApp, Number(port))
  })

  process.on('SIGINT', async () => {
    if (configLoader()?.CACHE_MODE === 'MONGODB') {
      await MongoDbCacheManager.mongoClient.close()
      serverLogger.info('\nMongoDB connection closed')
    }
    serverLogger.info('Cloud Carbon Footprint Server shutting down...')
    process.exit()
  })
}

// Connect to MongoDB and start the server
mongoose.connect('mongodb+srv://ccfuser:temppassword@cluster0.pxe5y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  dbName: 'test',
  serverSelectionTimeoutMS: 5000,
})
.then(() => {
  console.log('Connected to MongoDB')
  startServer().catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
})
.catch((error) => {
  console.error('Failed to connect to MongoDB:', error)
})
