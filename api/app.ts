import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import parkingLotRoutes from './routes/parkingLot.js'
import spotsRoutes from './routes/spots.js'
import vehiclesRoutes from './routes/vehicles.js'
import billingRoutes from './routes/billing.js'
import guidanceRoutes from './routes/guidance.js'
import monthlyRoutes from './routes/monthly.js'
import statsRoutes from './routes/stats.js'
import visitorsRoutes from './routes/visitors.js'
import alertsRoutes from './routes/alerts.js'
import reportsRoutes from './routes/reports.js'
import platesRoutes from './routes/plates.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/parking-lot', parkingLotRoutes)
app.use('/api/spots', spotsRoutes)
app.use('/api/vehicles', vehiclesRoutes)
app.use('/api', billingRoutes)
app.use('/api/guidance', guidanceRoutes)
app.use('/api/monthly', monthlyRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/visitors', visitorsRoutes)
app.use('/api/alerts', alertsRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/plates', platesRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error.message, error.stack)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
