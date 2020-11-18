import { StoreApi } from 'zustand'

import { postJSON } from '@bothrs/util/fetch'
import { ls } from '@bothrs/util/ls'

// Boardgame stores

// Boardgame stores > Turns
export type TurnBasedType = {
  turn: number
  playerCount: number
  nextTurn: () => number
}

export const TurnBasedState = {
  turn: 1,
  playerCount: 2,
}
export const TurnBased = (set, get): TurnBasedType => ({
  turn: 1,
  playerCount: 2,
  nextTurn: () => (get().turn % get().playerCount) + 1,
})

// Boardgame stores > Active piece
export type ActivePieceType<T> = {
  active: null | T
  hold: boolean
  hover: (piece: T) => void
}

export const ActivePieceState = {
  active: null,
  hold: false,
}
export const ActivePiece = <T>(set, get): ActivePieceType<T> => ({
  active: null,
  hold: false,
  hover: (active: T) => set({ active }),
})

// Boardgame stores > LocalCache
export type LocalCacheType<T> = object
export const LocalCacheState = {}
export const LocalCache = <T>(
  api: StoreApi<any>,
  key = () => 'state',
  fields: string[] = []
) => {
  setTimeout(() => {
    api.subscribe(
      () => {
        // Not all data is at game level...
        const snapshot = pick(api.getState(), fields)
        ls(key(), snapshot)
      },
      (val) => val.turn
    )
  }, 1)
  return (typeof window !== 'undefined' && ls(key())) || {}
}

// Boardgame stores > Multiplayer
export type MultiplayerType = {
  online: boolean
  socket: null | WebSocket
  participants: string[]
  sync: (state: object) => void
  connect: () => void
}

// export const MultiplayerState = {
//   online: false,
//   socket: null,
// }
export const Multiplayer: C<MultiplayerType> = (set, get) => ({
  online: false,
  socket: null,
  participants: [],
  sync: (state: object) => {
    const { socket, online } = get()
    try {
      socket.send(JSON.stringify({ state }))
    } catch (e) {
      if (online) {
        alert('sync down')
      }
    }
  },
  connect: () => {
    if (!get().online) {
      return
    }
    let mounted = true
    connect(window.location.pathname.split('/')[1]).catch((e) => {
      console.log('Failed to connect', e)
    })
    return () => {
      mounted = false
      get().socket?.close()
    }

    async function connect(room) {
      console.log('connect', room)
      const { ws } = await postJSON('/api/worker?room=' + room)
      if (!ws) {
        throw new Error('Failed to get room')
      }
      console.log('connecting', ws)
      const socket = new WebSocket(ws)
      socket.addEventListener('open', (evt) => {
        if (!mounted || !get().online) {
          return socket.close()
        }

        console.log('connection open', socket.readyState)
        set({ socket })
      })
      socket.addEventListener('message', (evt) => {
        const data = JSON.parse(evt.data)
        if (data.state) {
          // console.log('got data', data.state)
          set(data.state)

          // TODO refactor if type issues
          const { active, turn } = get()
          if (active && active.player !== turn) {
            set({ active: null, hold: false })
          }
        }
        if (data.participants) {
          console.log('ws', data)
          set({ participants: data.participants })
        }
      })
      socket.addEventListener('close', (evt) => {
        console.log('connect.closed', evt)
        set({ socket: null, participants: [] })
        if (mounted && get().online) {
          connect(room)
        }
      })
      socket.addEventListener('error', (evt) => {
        console.log('connect.error', evt)
        socket.close()
        set({ socket: null, participants: [] })
      })
    }
  },
})

// Generic boardgame types

export type Position = {
  top: number
  left: number
  height?: number
}

// Helpers

export function cartesian<A, B>(...a: [A[], B[]]): [A, B][]
export function cartesian<A, B, C>(...a: [A[], B[], C[]]): [A, B, C][]
export function cartesian(...a: any[][])
export function cartesian(...a: any[][]) {
  return a.reduce((a, b) => a.flatMap((d) => b.map((e) => [d, e].flat())))
}
type C<X> = (get?: Function, set?: Function, api?: any) => X

// export function merge<T extends S, U extends S>(
//   ...stores: [C<T>, C<U>]
// ): C<T & U>
// export function merge<T extends S, U extends S, V extends S>(
//   ...stores: [C<T>, C<U>, C<V>]
// ): C<T & U & V>
// export function merge<T extends S, U extends S, V extends S, W extends S>(
//   ...stores: [C<T>, C<U>, C<V>, C<W>]
// ): C<T & U & V & W>
// export function merge<T extends S>(...stores: C<T>[]): C<T>
// export function merge<T extends S>(...stores: C<T>[]): C<T> {
//   return (set, get, api) =>
//     Object.assign(
//       {},
//       ...stores.map((create) =>
//         typeof create === 'function' ? create(set, get, api) : create
//       )
//     )
// }

function pick<T>(obj: T & object, fields: string[]): Partial<T> {
  return fields.reduce((acc, x) => {
    if (obj.hasOwnProperty(x)) {
      acc[x] = obj[x]
    }
    return acc
  }, {})
}
