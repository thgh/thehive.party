import zustand from 'zustand'

import {
  ActivePiece,
  ActivePieceType,
  cartesian,
  LocalCache,
  Multiplayer,
  MultiplayerType,
  Position,
  TurnBased,
  TurnBasedType,
} from './game'

export type { Position }

export type PlayerName = 1 | 2
export const PLAYERS = [1, 2]

export type PieceType = 1 | 2 | 3 | 4 | 5
export const STONE_TYPES = [1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 5]
export const STONE_FILLS = [
  '#888', // Ghost
  '#f39c12', // Queen bee
  '#34495e', // Spider
  '#8e44ad', // Beetles
  '#27ae60', //Grasshoppers
  '#c0392b', // Soldier Ants
  '#2980b9',
]

export type UnplacedPiece = {
  id: number
  type: PieceType
  player: PlayerName
}

export type PlacedPiece = Position & UnplacedPiece

export type Piece = PlacedPiece | UnplacedPiece

export const ALL_PIECES = cartesian(
  PLAYERS,
  STONE_TYPES
).map(([player, type], id) => ({ id: id + 1, player, type }))

export type TheHiveGame = { stones: PlacedPiece[]; restart: () => void }

export type GameType = ActivePieceType<Piece> &
  MultiplayerType &
  TurnBasedType &
  TheHiveGame

export const useGame = zustand<GameType>((set, get, api) => ({
  ...ActivePiece<Piece>(set, get),
  ...Multiplayer(set, get),
  ...TurnBased(set, get),
  stones: [],
  ...LocalCache(
    api,
    () => 'thehive/state',
    ['online']
  ),
  ...LocalCache(
    api,
    () => 'thehive/games/' + window.location.pathname.split('/')[1],
    ['turn', 'stones']
  ),
  restart() {
    set({ active: null, hold: false, stones: [] })
    get().sync({ stones: [] })
  },
}))

// (set, get) => ({
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
//   },
// })
