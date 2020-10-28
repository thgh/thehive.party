import React, { useEffect, useReducer, useRef, useState } from 'react'
import Head from 'next/head'
import zustand from 'zustand'

import { Stone } from '../../lib/types'
import { useClientside } from '../../lib/useClientside'
import { moveMessagePortToContext } from 'worker_threads'

const DEBUG = false
const STONE_WIDTH = 50
const STONE_MARGIN = 5
const STONE_FILLS = [
  '#222',
  '#f39c12',
  '#c0392b',
  '#27ae60',
  '#2980b9',
  '#8e44ad',
  '#34495e',
]
const STONE_TYPES = [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4]

// Computed
const STONE_HEIGHT = (STONE_WIDTH * 200) / 174
const STONE_HEIGHT_M = STONE_HEIGHT + STONE_MARGIN
const STONE_WIDTH_M = STONE_WIDTH + STONE_MARGIN

const STONES_RESERVOIR = STONE_TYPES.flatMap((type) => [
  { type, player: 1 },
  { type, player: 2 },
]).map((s, id) => ({
  ...s,
  id,
}))

export default function Game() {
  const client = useClientside()
  return (
    <div className="container">
      <Head>
        <title>Impostor.party</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <h1 className="title">{client.userId || '?'}</h1>
        {client.state === 1 ? <World {...client} /> : null}
      </main>
      <style jsx global>{`
        html,
        body {
          padding: 0;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
            Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
            sans-serif;
          color: white;
          background: black;
          overflow: hidden;
        }
        h1 {
          position: absolute;
          left: 0;
          right: 0;
          opacity: 0.2;
          margin: 1em;
          font-weight: 100;
          font-size: 10vh;
          text-align: center;
        }

        * {
          box-sizing: border-box;
        }

        .world {
          display: flex;
          flex-direction: column;
          width: 100vw;
          height: 100vh;
        }
        .field {
          min-height: 50vh;
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .field-inner {
          position: relative;
        }
        .reservoirs {
          flex: 0;
          display: flex;
          flex-direction: row;
        }
        .reservoir {
          flex: 1;
          max-height: 50vh;
          display: flex;
          flex-wrap: wrap;
          padding: 20px;
          justify-content: center;
          overflow: auto;
        }
        .reservoir .hexagon {
          margin: 3px;
        }
        .reservoir-1 {
          background: rgba(255, 0, 0, 0.3);
        }
        .reservoir-2 {
          background: rgba(0, 0, 255, 0.3);
        }
      `}</style>
    </div>
  )
}

function World({ userId }) {
  const { stones, active } = useGame()

  const reservoir1 = STONES_RESERVOIR.filter(
    (r) => r.player === 1 && !stones.find((s) => s.id === r.id)
  )

  const reservoir2 = STONES_RESERVOIR.filter(
    (r) => r.player === 2 && !stones.find((s) => s.id === r.id)
  )

  const moves = getMoves(stones, active)

  return (
    <div className="world">
      <div className="field">
        <div className="field-inner">
          {stones.map((stone) => (
            <PlacedStone
              key={stone.id}
              stone={stone}
              onMouseEnter={() => activate(stone)}
              onMouseLeave={deactivate}
            />
          ))}
          {moves.map((position, key) => (
            <PlacedStone
              key={key}
              stone={position}
              onDrop={() => moveStone(active as Stone, position)}
              onDragOver={(evt) => evt.preventDefault()}
            />
          ))}
        </div>
      </div>
      <div className="reservoirs">
        <div className="reservoir reservoir-1">
          {reservoir1.map((stone) => (
            <Hexagon
              key={stone.id}
              stone={stone}
              onMouseEnter={() => activate({ player: 1, type: stone.type })}
              onMouseLeave={deactivate}
              onDragStart={() => ({ type: 3 })}
              draggable
            />
          ))}
        </div>
        <div className="reservoir reservoir-2">
          {reservoir2.map((stone) => (
            <Hexagon
              key={stone.id}
              stone={stone}
              onMouseEnter={() => activate({ player: 2, type: stone.type })}
              onMouseLeave={deactivate}
              onDragStart={() => ({ type: 3 })}
              draggable
            />
          ))}
        </div>
      </div>
    </div>
  )
}
// {JSON.stringify(stones)}

type GameType = {
  stones: Stone[]
  active: null | { player: number; type: number } | Stone
}

const useGame = zustand<GameType>((set) => ({
  active: null,
  stones: [
    // { id: 1, player: 1, type: 1, top: 1, left: 1 },
    // { id: 2, player: 2, type: 2, top: 2, left: 0 },
    // { id: 3, player: 1, type: 3, top: 2, left: 1 },
    // { id: 4, player: 2, type: 4, top: 0, left: 2 },
    // { id: 5, player: 1, type: 5, top: 0, left: 1 },
    // { id: 0, player: 2, type: 6, top: 1, left: 0 },
    // { id: 6, player: 1, type: 3, top: -1, left: -1 },
    // { id: 7, player: 2, type: 3, top: -1, left: -2 },
    // { id: 8, player: 1, type: 4, top: 0, left: -1 },
    // { id: 9, player: 2, type: 5, top: 1, left: -2 },
  ],
}))

function activate(active) {
  useGame.setState({ active })
}
function deactivate() {
  useGame.setState({ active: null })
}

function moveStone(stone: Stone, { top = 0, left = 0 }) {
  console.log('moveStone')
  useGame.setState(({ stones }) => {
    stone.top = top
    stone.left = left
    if (!stones.includes(stone)) {
      return { stones: stones.concat(stone) }
    }
    return { stones }
  })
}

function getMoves(stones, active) {
  if (!active) {
    return []
  }
  if (!stones.length) {
    return [{ type: 0, top: 0, left: 0 }]
  }
  if (stones.length === 1) {
    return around({ top: 0, left: 0 })
  }

  // Around any stone
  if (typeof active.top === 'number') {
    return stones
      .flatMap(around)
      .filter((m) => !stones.find((s) => m.top === s.top && m.left === s.left))
  }

  // Around my own stones
  return stones
    .filter((s) => s.player === active.player)
    .flatMap(around)
    .filter((m) => !stones.find((s) => m.top === s.top && m.left === s.left))
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

function Hexagon({
  placed = false,
  stone: { player = 0, type = 2, top = 0, left = 0 },
  ...rest
}) {
  const stroke = 16
  return (
    <div
      className="hexagon"
      style={
        placed
          ? {
              position: 'absolute',
              top: (top * STONE_HEIGHT_M * 2 * 200) / 174 / 3,
              left:
                (left + parseInt('' + top / 2) + (top % 2) / 2) * STONE_WIDTH_M,
              transition: '',
            }
          : {}
      }
      draggable={!!type}
      {...rest}
    >
      {DEBUG && (
        <div style={{ position: 'absolute', left: 20, top: 5, fontSize: 10 }}>
          {top}
        </div>
      )}
      {DEBUG && (
        <div style={{ position: 'absolute', left: 5, top: 20, fontSize: 10 }}>
          {left}
        </div>
      )}
      <svg
        width={STONE_WIDTH}
        height={STONE_HEIGHT}
        viewBox={[-stroke / 2, -stroke / 2, 174 + stroke, 200 + stroke].join(
          ' '
        )}
      >
        <polyline
          fill={STONE_FILLS[type]}
          strokeWidth={stroke}
          strokeLinejoin="round"
          strokeLinecap="round"
          stroke={type === 0 ? 'white' : player === 1 ? 'red' : 'blue'}
          points="87,0 174,50 174,150 87,200 0,150 0,50 87,0"
        />
      </svg>
      <style jsx>{`
        .hexagon {
          position: relative;
          background: rgba(255, 255, 255, 0);
          display: block;
          width: ${STONE_WIDTH}px;
          height: ${STONE_HEIGHT}px;
        }
        svg {
          display: block;
        }
      `}</style>
    </div>
  )
}
