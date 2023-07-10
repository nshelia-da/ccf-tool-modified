import http from 'http'
import { Logger } from '@cloud-carbon-footprint/common'
const logger = new Logger('health-check')

const routing: Record<string, string | object> = {
  '/health-check': 'It works!',
}

const types: Record<string, any> = {
  string: (s: string) => s,
  undefined: () => {
    throw new Error('Bad request')
  },
}

export async function createServer() {
  http
    .createServer((req, res) => {
      try {
        const data = routing[req.url]
        const type = typeof data
        const serializer = types[type]
        const result = serializer(data, req, res)
        logger.info('Health check')
        res.end(result)
      } catch (error) {
        res.writeHead(400)
        res.end(error.message)
      }
    })
    .listen(8008)
  logger.info('Health check up and running')
}
