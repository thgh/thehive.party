import type { NextApiRequest, NextApiResponse } from 'next'
import { RemoteWorker } from './_ambient'

const workers = new Map<string, RemoteWorker>()

export default async (req: NextApiRequest, res: NextApiResponse) => {
  console.log('req.s', req.query)
  const alias = String(req.query.room) || 'testgame'
  const worker =
    workers.get(alias) ||
    new RemoteWorker('http://localhost:8000/websocket-broadcast-worker.ts', {
      alias,
    })
  const { port } = await worker.request('state')
  const { url } = await worker.instance
  const ws = new URL(url)
  ws.protocol = 'ws:'
  ws.port = port
  ws.pathname = '/'

  res.json({
    // url: worker.url,
    // last: url,
    ws: ws,
    // active: worker.active,
  })
}
