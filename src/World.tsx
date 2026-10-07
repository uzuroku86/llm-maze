import { Billboard, Text } from '@react-three/drei'
import type { ThoughtNode } from './thoughtGraph'

const PATH_LENGTH = 12
const PATH_WIDTH = 2
const PATH_OVERLAP = 1
const ROOM_RADIUS = 5
const BRANCH_ROOM_RADIUS = 4
const LABEL_HEIGHT = 3.5
const BRANCH_SPREAD = Math.PI / 4

// 後から枝が増えても既存の道が動かないよう、番号ごとに角度を固定する
const BRANCH_SLOTS = [-1, 0, 1, -2, 2]
export const MAX_BRANCHES = BRANCH_SLOTS.length

const branchAngle = (i: number) => BRANCH_SLOTS[i] * BRANCH_SPREAD

export function isWalkable(root: ThoughtNode, x: number, z: number) {
  if (Math.hypot(x, z) <= ROOM_RADIUS) return true

  const count = root.branches?.length ?? 0
  for (let i = 0; i < count; i++) {
    const angle = branchAngle(i)
    const along = x * Math.sin(angle) - z * Math.cos(angle)
    const across = x * Math.cos(angle) + z * Math.sin(angle)
    if (Math.abs(across) <= PATH_WIDTH / 2 && along >= ROOM_RADIUS - PATH_OVERLAP && along <= ROOM_RADIUS + PATH_LENGTH + PATH_OVERLAP) {
      return true
    }
    if (Math.hypot(along - (ROOM_RADIUS + PATH_LENGTH + BRANCH_ROOM_RADIUS), across) <= BRANCH_ROOM_RADIUS) {
      return true
    }
  }
  return false
}

export function getPathDirection(root: ThoughtNode, x: number, z: number) {
  if (Math.hypot(x, z) <= ROOM_RADIUS) return null

  const count = root.branches?.length ?? 0
  for (let i = 0; i < count; i++) {
    const angle = branchAngle(i)
    const along = x * Math.sin(angle) - z * Math.cos(angle)
    const across = x * Math.cos(angle) + z * Math.sin(angle)
    if (Math.abs(across) <= PATH_WIDTH / 2 && along >= ROOM_RADIUS && along <= ROOM_RADIUS + PATH_LENGTH) {
      return { x: Math.sin(angle), z: -Math.cos(angle) }
    }
  }
  return null
}

function Label({ text, position, fontSize = 1 }: { text: string; position: [number, number, number]; fontSize?: number }) {
  return (
    <Billboard position={position}>
      <Text
        fontSize={fontSize}
        maxWidth={12}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        color="#000"
        outlineWidth={0.05}
        outlineColor="#fff"
      >
        {text}
      </Text>
    </Billboard>
  )
}

function Room({ radius, color }: { radius: number; color: string }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
      <circleGeometry args={[radius, 48]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Branch({ node, angle }: { node: ThoughtNode; angle: number }) {
  const end = ROOM_RADIUS + PATH_LENGTH + BRANCH_ROOM_RADIUS
  const pathCenter = ROOM_RADIUS + PATH_LENGTH / 2

  return (
    <group rotation-y={-angle}>
      <mesh position={[0, 0, -pathCenter]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[PATH_WIDTH, PATH_LENGTH + PATH_OVERLAP * 2]} />
        <meshStandardMaterial color="#6b7a99" />
      </mesh>
      <group position={[0, 0, -end]}>
        <Room radius={BRANCH_ROOM_RADIUS} color="#3d4a6b" />
        <Label text={node.label} position={[0, LABEL_HEIGHT, 0]} />
      </group>
    </group>
  )
}

export default function World({ root }: { root: ThoughtNode }) {
  const branches = root.branches ?? []

  return (
    <>
      <Room radius={ROOM_RADIUS} color="#3d4a6b" />
      <Label text={root.label} position={[0, 3, 0]} fontSize={0.5} />
      {branches.map((node, i) => (
        <Branch key={node.id} node={node} angle={branchAngle(i)} />
      ))}
    </>
  )
}
