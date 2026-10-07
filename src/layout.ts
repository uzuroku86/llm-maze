import type { ThoughtNode } from './thoughtGraph'

export const PATH_WIDTH = 2
export const PATH_OVERLAP = 1
export const ROOT_RADIUS = 5
export const ROOM_RADIUS = 4

const ROOT_SPREAD = Math.PI / 4
const SPREAD = Math.PI / 6

// 後から枝が増えても既存の道が動かないよう、番号ごとに角度を固定する
const SLOTS = [-1, 0, 1, -2, 2]
export const MAX_BRANCHES = SLOTS.length

// 隣り合う部屋の文章が重ならないよう、番号ごとに道の長さを変える
const SLOT_PATH_LENGTHS = [12, 22, 12, 22, 22]

export type Room = {
  node: ThoughtNode
  x: number
  z: number
  heading: number
  radius: number
  length: number
  depth: number
  parent: Room | null
  children: Room[]
}

// 枝が内側に曲がって交差しないよう、2階層目以降は原点から見て外向きを基準に広げる
export const headingOf = (parent: Room, index: number) => {
  const base = parent.parent ? Math.atan2(parent.x, -parent.z) : parent.heading
  return base + SLOTS[index] * (parent.parent ? SPREAD : ROOT_SPREAD)
}

export function layoutGraph(root: ThoughtNode): Room[] {
  const rooms: Room[] = []

  const place = (node: ThoughtNode, parent: Room | null, index: number) => {
    let room: Room
    if (!parent) {
      room = { node, x: 0, z: 0, heading: 0, radius: ROOT_RADIUS, length: 0, depth: 0, parent, children: [] }
    } else {
      const heading = headingOf(parent, index)
      const length = SLOT_PATH_LENGTHS[index]
      const distance = parent.radius + length + ROOM_RADIUS
      room = {
        node,
        x: parent.x + Math.sin(heading) * distance,
        z: parent.z - Math.cos(heading) * distance,
        heading,
        radius: ROOM_RADIUS,
        length,
        depth: parent.depth + 1,
        parent,
        children: [],
      }
      parent.children.push(room)
    }
    rooms.push(room)
    node.branches?.slice(0, MAX_BRANCHES).forEach((child, i) => place(child, room, i))
  }

  place(root, null, 0)
  return rooms
}

export const pathStart = (room: Room) => {
  const parent = room.parent!
  return {
    x: parent.x + Math.sin(room.heading) * parent.radius,
    z: parent.z - Math.cos(room.heading) * parent.radius,
  }
}

const inRoom = (room: Room, x: number, z: number) => Math.hypot(x - room.x, z - room.z) <= room.radius

const inPath = (room: Room, x: number, z: number) => {
  if (!room.parent) return false
  const start = pathStart(room)
  const dx = x - start.x
  const dz = z - start.z
  const along = dx * Math.sin(room.heading) - dz * Math.cos(room.heading)
  const across = dx * Math.cos(room.heading) + dz * Math.sin(room.heading)
  return Math.abs(across) <= PATH_WIDTH / 2 && along >= -PATH_OVERLAP && along <= room.length + PATH_OVERLAP
}

export const isWalkable = (rooms: Room[], x: number, z: number) =>
  rooms.some((room) => inRoom(room, x, z) || inPath(room, x, z))

export function getPathDirection(rooms: Room[], x: number, z: number) {
  if (rooms.some((room) => inRoom(room, x, z))) return null
  const room = rooms.find((r) => inPath(r, x, z))
  return room ? { x: Math.sin(room.heading), z: -Math.cos(room.heading) } : null
}

export const nearestRoom = (rooms: Room[], x: number, z: number) =>
  rooms.reduce((best, room) =>
    Math.hypot(x - room.x, z - room.z) < Math.hypot(x - best.x, z - best.z) ? room : best,
  )
