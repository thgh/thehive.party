import type { NextApiRequest, NextApiResponse } from 'next'
import { RemoteWorker } from './_ambient'

const WORKER_BY_SOURCE = true
const workers = new Map<string, RemoteWorker>()

export default async (req: NextApiRequest, res: NextApiResponse) => {
  console.log('api/worker query', req.query)
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
  try {
    console.log('api/worker before')
    const { url } = await worker.instance
    console.log('api/worker after', url)

    // Derive URL from worker, not so clean :-/
    const workerURL = new URL(url)
    const ws = new URL(worker.server)
    ws.protocol = ws.protocol.replace('http', 'ws')
    ws.pathname = workerURL.pathname.replace('/workers/', '/ws/')

    res.json({
      ready: true,
      // url: worker.url,
      // last: url,
      ws: ws,
      // active: worker.active,
    })
  } catch (e) {
    console.log('api/worker caught', e)
    res.status(500).json({
      ready: false,
      error: { message: e.message },
    })
  }
}

const js = String.raw
const btoa = (b) => Buffer.from(b).toString('base64')

const toDataURI = (str: string) =>
  'data:application/javascript;charset=utf-8;base64,' + btoa(str)

const workerSource = () =>
  toDataURI(js`
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  WebSocket,
} from 'https://deno.land/std@0.76.0/ws/mod.ts'
import type { ServerRequest } from 'https://deno.land/std@0.76.0/http/server.ts'
console.log('wbw Broadcast worker starting')

type SocketId = string

let state = {}
let serverState = 0
let sockets = new Map<SocketId, WebSocket>()

export default async function onmessage(data: any) {
  console.log('wbw.onmessage', data)
  return {
    message: {
      serverState,
    },
  }
}

export async function onwebsocket(req: ServerRequest) {
  console.log('wbw.Accepting websocket!')

  serverState = 2

  const { conn, r: bufReader, w: bufWriter, headers } = req
  const sock = await acceptWebSocket({
    conn,
    bufReader,
    bufWriter,
    headers,
  })
  const uid = Math.random().toString(36).slice(2)
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
  console.log('wbw.ws.join', id, state)
  sockets.set(id, sock)
  broadcast({ join: id }, id)
  sock.send(JSON.stringify({ id, state, participants: Array.from(sockets.keys()) }))
}

function onMessage(id: SocketId, json: string) {
  console.log('wbw.ws.message', json)
  if (!json.startsWith('{')) return
  const message = JSON.parse(json)
  if (message.state) {
    state = { ...state, ...message.state }
    broadcast({ id, state }, id)
  }
}

function onClose(id: SocketId, event?: any) {
  console.log('wbw.ws.close', id, event)
  sockets.delete(id)
  broadcast({ leave: id })
}

function broadcast(message: object, uid = '') {
  sockets.forEach((sock, uid) => {
    if (sock.isClosed) {
      sockets.delete(uid)
    }
  })
  console.log('bro', {
    ...message,
    participants: Array.from(sockets.keys()),
  })
  sockets.forEach(
    (sock, id) =>
      uid !== id &&
      sock.send(
        JSON.stringify({
          participants: Array.from(sockets.keys()),
          ...message,
        })
      )
  )
}  
`)
