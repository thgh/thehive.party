import React, { useEffect, useMemo } from 'react'
// import zustand from 'zustand'
import { TransitionGroup, Transition } from 'react-transition-group'

// import { postJSON } from '@bothrs/util/fetch'
import { ls } from '@bothrs/util/ls'

import Head from '../../components/Head'

import {
  STONE_FILLS,
  ALL_PIECES,
  Piece,
  Position,
  PlacedPiece,
  useGame,
  GameType,
} from '../../lib/thehive'
import { useClientside } from '../../lib/useClientside'

const BROADCAST_SERVER = true
const DEBUG = false
const NAV_HEIGHT = 40
const STONE_WIDTH = 50
const STONE_MARGIN = 5

// Computed
const STONE_HEIGHT = (STONE_WIDTH * 200) / 174
const STONE_HEIGHT_M = STONE_HEIGHT + STONE_MARGIN
const STONE_WIDTH_M = STONE_WIDTH + STONE_MARGIN

const transitionStyles = {
  entering: { opacity: 1, transform: 'scale(1)' },
  entered: { opacity: 1, transform: 'scale(1)' },
  exiting: { opacity: 0, transform: 'scale(0)' },
  exited: { opacity: 0, transform: 'scale(0)' },
}

export default function Game() {
  const client = useClientside()
  return (
    <div className="container ">
      <Head />
      <main>
        <h1 className="title">{client.userId || '?'}</h1>
        {client.state === 1 ? <World {...client} /> : null}
      </main>
    </div>
  )
}

function World({ userId }) {
  const {
    online,
    socket,
    stones,
    turn,
    active,
    restart,
    connect,
    participants,
  } = useGame()

  useEffect(connect, [online])

  const reservoir = ALL_PIECES.filter(
    (r) => r.player === turn && !stones.find((s) => s.id === r.id)
  )

  const moves = getMoves(stones, active)

  const center = getCenter(stones)
  const width = useMemo(() => window.innerWidth, [turn])
  const height = useMemo(
    () => window.innerHeight * 0.96 - NAV_HEIGHT - STONE_HEIGHT,
    [turn]
  )
  const zoom = Math.min(width / center.width, height / center.height)

  const x = -(center.leftMax + center.leftMin) / 2
  const y = NAV_HEIGHT / zoom / 2 - (center.topMax + center.topMin) / 2

  // useEffect(() => {
  //   console.log('zoom', zoom, width, '/', height)
  //   console.log('c: ', center.width, '/', center.height)
  //   console.log('s: ', width / center.width, '/', height / center.height)
  // }, [zoom, width, height, center.width, center.height])

  return (
    <div className="world">
      <nav>
        {socket ? 'connected' : ''}
        <button onClick={toggleOnline}>Play{online ? 'ing' : ''} online</button>
        <button onClick={toggleFullscreen}>Fullscreen</button>
        <button onClick={restart}>Restart</button>
        <pre>{JSON.stringify(participants, null, 2)}</pre>
      </nav>
      <div className="field">
        <div
          className="field-inner"
          style={{
            transform: `scale(${zoom}) translateX(${x}px) translateY(${y}px)`,
          }}
        >
          {DEBUG && (
            <div
              className="actual"
              style={{
                top: center.topMin,
                left: center.leftMin,
                width: center.width,
                height: center.height,
              }}
            ></div>
          )}
          <div>
            {stones.map((stone) => (
              <PlacedStone
                key={'' + stone.id}
                stone={stone}
                active={stone.id === active?.id}
                onClick={() => activate(stone, true)}
                onMouseEnter={() => activate(stone)}
                // onMouseLeave={deactivate}
              />
            ))}
          </div>
          <div>
            <TransitionGroup className="move-list">
              {moves.map((position, key) => (
                <Transition
                  classNames="move"
                  timeout={1000}
                  key={position.top + ' ' + position.left}
                >
                  {(state) => (
                    <PlacedStone
                      style={transitionStyles[state]}
                      stone={position}
                      onClick={() => moveStone(active as Piece, position)}
                      onDrop={() => moveStone(active as Piece, position)}
                      onDragOver={(evt) => evt.preventDefault()}
                    />
                  )}
                </Transition>
              ))}
            </TransitionGroup>
          </div>
        </div>
      </div>
      <div className="reservoirs">
        <div className={'reservoir reservoir-' + turn}>
          {reservoir.map((stone) => (
            <Hexagon
              key={stone.id}
              stone={stone}
              active={stone.id === active?.id}
              onClick={() => activate(stone, true)}
              onMouseEnter={() => activate(stone)}
              draggable
            />
          ))}
        </div>
      </div>
    </div>
  )
}
// {JSON.stringify(stones)}

// type GameType = {
//   turn: 1 | 2
//   active: null | Piece
//   hold: boolean
//   stones: PlacedPiece[]
//   restart: () => void

//   // Multiplayer
//   online: boolean
//   socket: null | WebSocket
//   sync: () => void
// }

// const useGame = zustand<GameType>((set, get) => ({
//   turn: 1,
//   active: null,
//   hold: false,
//   stones: [
//     // { id: 1, player: 1, type: 1, top: 1, left: 1 },
//     // { id: 2, player: 2, type: 2, top: 2, left: 0 },
//     // { id: 3, player: 1, type: 3, top: 2, left: 1 },
//     // { id: 4, player: 2, type: 4, top: 0, left: 2 },
//     // { id: 5, player: 1, type: 5, top: 0, left: 1 },
//     // { id: 0, player: 2, type: 6, top: 1, left: 0 },
//     // { id: 6, player: 1, type: 3, top: -1, left: -1 },
//     // { id: 7, player: 2, type: 3, top: -1, left: -2 },
//     // { id: 8, player: 1, type: 4, top: 0, left: -1 },
//     // { id: 9, player: 2, type: 5, top: 1, left: -2 },
//   ],
//   restart() {
//     set({ active: null, hold: false, stones: [] })
//     sync({ stones: [] })
//   },

//   // Multiplayer
//   online: false,
//   socket: null,
//   sync: () => {
//     if (!BROADCAST_SERVER) return
//     let mounted = true
//     if (get().online) {
//       connect(window.location.pathname.split('/')[1]).catch((e) => {
//         console.log('Failed to connect', e)
//       })
//     }
//     return () => {
//       mounted = false
//       get().socket?.close()
//     }

//     async function connect(room) {
//       console.log('connect', room)
//       const { ws } = await postJSON('/api/worker?room=' + room)
//       if (!ws) {
//         throw new Error('Failed to get room')
//       }
//       console.log('connecting', ws)
//       const socket = new WebSocket(ws)
//       socket.addEventListener('open', (evt) => {
//         if (!mounted || !get().online) {
//           return socket.close()
//         }

//         console.log('connection open', socket.readyState)
//         set({ socket })
//       })
//       socket.addEventListener('message', (evt) => {
//         const data = JSON.parse(evt.data)
//         if (data.state) {
//           // console.log('got data', data.state)
//           set(data.state)

//           const { active, turn } = get()
//           if (active && active.player !== turn) {
//             set({ active: null, hold: false })
//           }
//         }
//       })
//       socket.addEventListener('close', (evt) => {
//         console.log('connect.closed', evt)
//         set({ socket: null })
//         if (mounted && get().online) {
//           connect(room)
//         }
//       })
//       socket.addEventListener('error', (evt) => {
//         console.log('connect.error', evt)
//         socket.close()
//         set({ socket: null })
//       })
//     }
//   },
// }))

function sync(data: Partial<GameType>) {
  useGame.getState().sync(data)
}

function activate(active, hold = false) {
  if (active?.player !== useGame.getState().turn) {
    return // console.log('not your turn', active)
  }
  const { stones, active: current, hold: holding } = useGame.getState()
  if (!highest(active, 0, stones)) {
    return
  }
  if (holding && hold && current?.id === active?.id) {
    useGame.setState({ active: null, hold: false })
  } else if (holding && hold) {
    useGame.setState({ active, hold })
    // sync({ active })
  } else if (!holding) {
    useGame.setState({ active, hold })
    // sync({ active })
  }
}
function deactivate() {
  if (!useGame.getState().hold) {
    useGame.setState({ active: null })
    // sync({ active: null })
  }
}

function moveStone(stone: Piece, { top = 0, left = 0 }) {
  if (!stone) {
    return
  }
  useGame.setState(({ stones, turn, nextTurn }) => {
    const existing = stones.find((s) => s.id === stone.id)
    const height = stones.filter((s) => s.top === top && s.left === left).length

    turn = nextTurn()
    stones = existing
      ? stones
          .filter((s) => s.id !== stone.id)
          .concat({ ...existing, top, left, height })
      : stones.concat({ ...stone, top, left, height })
    stones.sort((a, b) => a.id - b.id)

    // TODO: don't broadcast to self, it interferes with transition
    setTimeout(() => sync({ stones, turn }), 500)
    return { stones, turn, active: null, hold: false }
  })
}

function getCenter(stones: Position[]) {
  if (!stones.length) {
    stones = [{ top: 0, left: 0 }]
  }
  let topMax = -Infinity
  let leftMax = -Infinity
  let topMin = Infinity
  let leftMin = Infinity
  for (const stone of stones) {
    const { top, left } = toField(stone)
    if (top > topMax) topMax = top
    if (left > leftMax) leftMax = left
    if (top < topMin) topMin = top
    if (left < leftMin) leftMin = left
  }
  // Add stone size
  topMax += STONE_HEIGHT_M
  leftMax += STONE_WIDTH_M
  // Add ghost stones
  topMin -= (STONE_HEIGHT_M * 5) / 6
  leftMin -= STONE_WIDTH_M + STONE_MARGIN
  topMax += (STONE_HEIGHT_M * 5) / 6
  leftMax += STONE_WIDTH_M
  return {
    topMax,
    leftMax,
    topMin,
    leftMin,
    height: topMax - topMin,
    width: leftMax - leftMin,
  }
}

function getMoves(
  stones: PlacedPiece[],
  active?: { id: number; player: number; type: number } | Piece
) {
  if (!active) {
    return []
  }
  if (!stones.length) {
    return [{ type: 0, top: 0, left: 0 }]
  }

  // Covered stones are ignored
  stones = stones.filter(highest)

  // My first stone, around any stone
  if (!stones.find((s) => s.player === active.player)) {
    // console.log('around any', stones.length, active?.player)
    return stones
      .flatMap(around)
      .filter((m) => !stones.find((s) => m.top === s.top && m.left === s.left))
  }

  // MOVE EXISTING STONE - Around any stone
  if ('top' in active && typeof active.top === 'number') {
    switch (active.type) {
      case 1:
        return around(active).filter(freespace)
      case 3:
        return around(active)
    }
    // console.log('around any top', stones.length, active?.player)
    return stones.flatMap(around).filter(freespace)
  }

  // Around my own stones, but not others
  const others = stones
    .filter((s) => s.player !== active.player)
    .flatMap(around)
  // console.log('around not others', stones.length, active?.player)
  return stones
    .filter((s) => s.player === active.player)
    .flatMap(around)
    .filter(freespace)
    .filter((m) => !others.find((s) => m.top === s.top && m.left === s.left))

  function freespace(m) {
    return !stones.find((s) => m.top === s.top && m.left === s.left)
  }
}

function around({ top = 0, left = 0 }) {
  return [
    { type: 0, top: top + 1, left: left + 0 },
    { type: 0, top: top + 0, left: left + 1 },
    { type: 0, top: top - 1, left: left + 0 },
    { type: 0, top: top + 0, left: left - 1 },

    { type: 0, top: top + 1, left: left - 1 },
    { type: 0, top: top - 1, left: left + 1 },
  ]
}

// function dragStart(params: type) {}

function PlacedStone(rest) {
  return <Hexagon placed {...rest} />
}

function toField({ top, left }: { top: number; left: number }) {
  return {
    top: (top * STONE_HEIGHT_M * 2 * 200) / 174 / 3,
    left: (left + parseInt('' + top / 2) + (top % 2) / 2) * STONE_WIDTH_M,
  }
}

function Hexagon({
  placed = false,
  active = false,
  stone,
  style = {},
  ...rest
}) {
  const { id, player = 0, type = 2, height = 0 } = stone
  const { top, left } = placed ? toField(stone) : { top: 0, left: 0 }
  const stroke = 8
  const symbolSize = type === 1 ? 36 : 24
  return (
    <div
      className={'hexagon' + (active ? ' active' : '') + (id ? ' id' : '')}
      style={{
        ...(placed
          ? {
              position: 'absolute',
              top: top - height * 7,
              left: left,
              zIndex: id ? height + 1 : 10,
            }
          : {}),
        ...style,
      }}
      draggable={!!type}
      {...rest}
    >
      {DEBUG && (
        <div style={{ position: 'absolute', left: 20, top: 5, fontSize: 10 }}>
          {id}
        </div>
      )}
      {DEBUG && (
        <div style={{ position: 'absolute', left: 5, top: 20, fontSize: 10 }}>
          {stone.top}, {stone.left} {height ? ', ' + height : ''}
        </div>
      )}

      <svg
        className="hexagon-svg"
        width={STONE_WIDTH}
        height={STONE_HEIGHT}
        viewBox={[-stroke / 2, -stroke / 2, 174 + stroke, 200 + stroke].join(
          ' '
        )}
      >
        <polyline
          stroke={type ? '#fff' : STONE_FILLS[type]}
          strokeWidth={type ? 0 : stroke}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill={type === 0 ? 'none' : player === 1 ? '#579' : '#27ae60'}
          points="87,0 174,50 174,150 87,200 0,150 0,50 87,0"
        />
      </svg>
      <svg
        style={{
          fill: player === 1 ? 'white' : 'black',
          position: 'absolute',
          left: STONE_WIDTH / 2 - symbolSize / 2,
          top: STONE_HEIGHT / 2 - symbolSize / 2,
        }}
        viewBox="0 0 24 24"
        width={symbolSize}
        height={symbolSize}
      >
        {types[type]}
      </svg>
      <style jsx>{`
        .hexagon {
          width: ${STONE_WIDTH}px;
          height: ${STONE_HEIGHT}px;
        }
      `}</style>
    </div>
  )
}

function toggleOnline(evt) {
  useGame.setState((game) => {
    ls('thehive:state', { online: !game.online })
    return { ...game, online: !game.online }
  })
}

function toggleFullscreen(evt) {
  evt?.target?.blur()
  let elem = document.querySelector('main')

  if (!document.fullscreenElement) {
    elem.requestFullscreen().catch((err) => {
      console.warn(`Error attempting to enable full-screen mode`, err)
    })
  } else {
    document.exitFullscreen()
  }
}

// Quadratic complexity but n is low
function highest({ top, left, height = 0 }, i, stones) {
  return !stones.find(
    (s) => s.top === top && s.left === left && s.height > height
  )
}

// '#f39c12', // Queen bee
// '#34495e', // Spider
// '#8e44ad', // Beetles
// '#27ae60', //Grasshoppers
const types = [
  null,
  <path d="M17.4 9C17 7.8 16.2 7 15 6.5V5H14V6.4H13.6C12.5 6.4 11.6 6.8 10.8 7.6L10.4 8L9 7.5C8.7 7.4 8.4 7.3 8 7.3C7.4 7.3 6.8 7.5 6.3 7.9C5.7 8.3 5.4 8.8 5.2 9.3C5 10 5 10.6 5.2 11.3C5.5 12 5.8 12.5 6.3 12.8C5.9 14.3 6.2 15.6 7.3 16.7C8.1 17.5 9 17.9 10.1 17.9C10.6 17.9 10.9 17.9 11.2 17.8C11.8 18.6 12.6 19.1 13.6 19.1C13.9 19.1 14.3 19.1 14.6 19C15.2 18.8 15.6 18.4 16 17.9C16.4 17.3 16.6 16.8 16.6 16.2C16.6 15.8 16.6 15.5 16.5 15.2L16 13.6L16.6 13.2C17.4 12.4 17.8 11.3 17.7 10.1H19V9H17.4M7.7 11.3C7.1 11 6.9 10.6 7.1 10C7.3 9.4 7.7 9.2 8.3 9.4L11.5 10.6C9.9 11.4 8.7 11.6 7.7 11.3M14 16.9C13.4 17.1 13 16.9 12.7 16.3C12.4 15.3 12.6 14.1 13.4 12.5L14.6 15.6C14.8 16.3 14.6 16.7 14 16.9M15.2 11.6L14.6 10V9.9L14.3 9.6H14.2L12.6 9C13 8.7 13.4 8.5 13.9 8.5C14.4 8.5 14.9 8.7 15.3 9.1C15.7 9.5 15.9 9.9 15.9 10.4C15.7 10.7 15.5 11.2 15.2 11.6Z" />,
  // <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z" />,
  // <path d="M18,3A2,2 0 0,1 20,5C20,5.81 19.5,6.5 18.83,6.82L17,13.15V18H7V13.15L5.17,6.82C4.5,6.5 4,5.81 4,5A2,2 0 0,1 6,3A2,2 0 0,1 8,5C8,5.5 7.82,5.95 7.5,6.3L10.3,9.35L10.83,5.62C10.33,5.26 10,4.67 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.67 13.67,5.26 13.17,5.62L13.7,9.35L16.47,6.29C16.18,5.94 16,5.5 16,5A2,2 0 0,1 18,3M5,20H19V22H5V20Z" />,
  <path d="M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z" />,
  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />,

  <path d="M12,14A2,2 0 0,1 14,16A2,2 0 0,1 12,18A2,2 0 0,1 10,16A2,2 0 0,1 12,14M23.46,8.86L21.87,15.75L15,14.16L18.8,11.78C17.39,9.5 14.87,8 12,8C8.05,8 4.77,10.86 4.12,14.63L2.15,14.28C2.96,9.58 7.06,6 12,6C15.58,6 18.73,7.89 20.5,10.72L23.46,8.86Z" />,
  <path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L5,8.09V15.91L12,19.85L19,15.91V8.09L12,4.15Z" />,
  null,
]
