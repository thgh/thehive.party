import type { NextApiRequest, NextApiResponse } from 'next'
import { RemoteWorker } from './_ambient'

const WORKER_BY_SOURCE = true
const workers = new Map<string, RemoteWorker>()

export default async (req: NextApiRequest, res: NextApiResponse) => {
  console.log('req.s', req.query)
  const alias = String(req.query.room) || 'testgame'
  const worker =
    workers.get(alias) ||
    new RemoteWorker(
      WORKER_BY_SOURCE
        ? workerSource()
        : 'http://localhost:8000/websocket-broadcast-worker.ts',
      {
        alias,
      }
    )
  const { port } = await worker.request('state')
  const { url } = await worker.instance

  // Derive URL from worker, not so clean :-/
  const workerURL = new URL(url)
  const ws = new URL(worker.server)
  ws.protocol = ws.protocol.replace('http', 'ws')
  ws.pathname = workerURL.pathname.replace('/workers/', '/ws/')

  res.json({
    // url: worker.url,
    // last: url,
    ws: ws,
    // active: worker.active,
  })
}

const js = String.raw
const btoa = (b) => Buffer.from(b).toString('base64')

const toDataURI = (str: string) =>
  'data:application/javascript;charset=utf-8;base64,' + btoa(str)

const workerSource = () =>
  toDataURI(js`import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  WebSocket,
} from 'https://deno.land/std@0.76.0/ws/mod.ts'
import type { ServerRequest } from 'https://deno.land/std@0.76.0/http/server.ts'
console.log('Broadcast worker starting')

type SocketId = number

const port = Math.floor(Math.random() * 10000 + 50000)
let state = {}
let serverState = 0
let sockets = new Map<SocketId, WebSocket>()

export default async function onmessage(data: any) {
  console.log('worker.onmessage', port, data)
  return {
    message: {
      serverState,
      port,
    },
  }
}

export async function onwebsocket(req: ServerRequest) {
  console.log("worker.Accepting websocket!")

  serverState = 2

  const { conn, r: bufReader, w: bufWriter, headers } = req
  const sock = await acceptWebSocket({
    conn,
    bufReader,
    bufWriter,
    headers,
  })
  const uid = Math.random()
  onConnect(uid, sock)
  for await (const ev of sock) {
    if (sock.isClosed) {
      onClose(uid)
    } else if (typeof ev === 'string') {
      onMessage(uid, ev)
    } else if (isWebSocketCloseEvent(ev)) {
      onClose(uid, ev)
    }
  }
}

function onConnect(id: SocketId, sock: WebSocket) {
  console.log('ws:join', id, state)
  sock.send(JSON.stringify({ id, state }))
  sockets.forEach(sock => sock.send(JSON.stringify({ join: id })))
  sockets.set(id, sock)
}

function onMessage(id: SocketId, newState: string) {
  console.log('ws:message', newState)
  if (!newState.startsWith('{')) return
  state = { ...state, ...JSON.parse(newState) }
  sockets.forEach(sock => sock.send(JSON.stringify({ id, state })))
}

function onClose(id: SocketId, event?: any) {
  console.log('ws:close', id, event)
  sockets.delete(id)
  sockets.forEach(sock => sock.send(JSON.stringify({ leave: id })))
}
`)
