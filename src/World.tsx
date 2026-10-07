import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import type { Group } from 'three'
import {
  PATH_LENGTH,
  PATH_OVERLAP,
  PATH_WIDTH,
  pathStart,
  type Room,
} from './layout'

const LABEL_HEIGHT = 3.5
const QUESTION_HEIGHT = 0.9
const QUESTION_OFFSET = 3

const PATH_DURATION = 0.6
const ROOM_DURATION = 0.35
const LABEL_DURATION = 0.3

// 生成されて表示された瞬間から、delay秒後にduration秒かけて大きくなる
function Grow({
  delay = 0,
  duration,
  axis,
  children,
}: {
  delay?: number
  duration: number
  axis?: 'z'
  children: ReactNode
}) {
  const ref = useRef<Group>(null)
  const startedAt = useRef<number | null>(null)

  useFrame(({ clock }) => {
    const group = ref.current
    if (!group) return
    startedAt.current ??= clock.elapsedTime
    const t = Math.min(1, Math.max(0, (clock.elapsedTime - startedAt.current - delay) / duration))
    const scale = Math.max(1 - (1 - t) ** 3, 0.0001)
    if (axis === 'z') group.scale.set(1, 1, scale)
    else group.scale.setScalar(scale)
  })

  return (
    <group ref={ref} scale={0.0001}>
      {children}
    </group>
  )
}

function Label({
  text,
  detail,
  position,
  fontSize = 0.75,
  maxWidth = 12,
}: {
  text: string
  detail?: string
  position: [number, number, number]
  fontSize?: number
  maxWidth?: number
}) {
  const common = {
    textAlign: 'center',
    anchorX: 'center',
    overflowWrap: 'break-word',
    color: '#000',
    outlineColor: '#fff',
  } as const

  return (
    <Billboard position={position}>
      <Text {...common} fontSize={fontSize} maxWidth={maxWidth} anchorY="bottom" outlineWidth={0.05}>
        {text}
      </Text>
      {detail && (
        <Text
          {...common}
          fontSize={fontSize * 0.55}
          maxWidth={maxWidth}
          anchorY="top"
          position-y={-0.2 * fontSize}
          outlineWidth={0.03}
        >
          {detail}
        </Text>
      )}
    </Billboard>
  )
}

function Path({ room }: { room: Room }) {
  const start = pathStart(room)
  return (
    <group position={[start.x, 0, start.z]} rotation-y={-room.heading}>
      <Grow axis="z" duration={PATH_DURATION}>
        <mesh position={[0, 0, -PATH_LENGTH / 2]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[PATH_WIDTH, PATH_LENGTH + PATH_OVERLAP * 2]} />
          <meshStandardMaterial color="#6b7a99" />
        </mesh>
      </Grow>
    </group>
  )
}

function RoomView({ room }: { room: Room }) {
  const { node } = room
  const isRoot = room.depth === 0
  const floor = (
    <mesh position-y={0.01} rotation-x={-Math.PI / 2}>
      <circleGeometry args={[room.radius, 48]} />
      <meshStandardMaterial color="#3d4a6b" />
    </mesh>
  )
  const label = isRoot ? (
    <Label text={node.label} detail={node.detail} position={[0, 3, 0]} fontSize={0.4} maxWidth={8} />
  ) : (
    <Label text={node.label} detail={node.detail} position={[0, LABEL_HEIGHT, 0]} />
  )

  return (
    <group position={[room.x, 0, room.z]}>
      {isRoot ? (
        <>
          {floor}
          {label}
        </>
      ) : (
        <>
          <Grow delay={PATH_DURATION} duration={ROOM_DURATION}>
            {floor}
          </Grow>
          <Grow delay={PATH_DURATION + ROOM_DURATION} duration={LABEL_DURATION}>
            {label}
          </Grow>
        </>
      )}
    </group>
  )
}

// 1回の相談で生えた道は、同じ問いを持つ連続した子ども。その中央の道の入口に問いを置く
function Questions({ room }: { room: Room }) {
  const signs: { id: string; question: string; x: number; z: number }[] = []
  const { children } = room
  for (let i = 0; i < children.length; ) {
    const question = children[i].node.question
    let end = i
    while (end < children.length && children[end].node.question === question) end++
    if (question) {
      const group = children.slice(i, end)
      const heading = group.reduce((sum, child) => sum + child.heading, 0) / group.length
      const distance = room.radius + QUESTION_OFFSET
      signs.push({
        id: group[0].node.id,
        question,
        x: room.x + Math.sin(heading) * distance,
        z: room.z - Math.cos(heading) * distance,
      })
    }
    i = end
  }

  return (
    <>
      {signs.map((sign) => (
        <group key={sign.id} position={[sign.x, QUESTION_HEIGHT, sign.z]}>
          <Grow duration={LABEL_DURATION}>
            <Billboard>
              <Text
                fontSize={0.35}
                maxWidth={7}
                textAlign="center"
                anchorX="center"
                anchorY="middle"
                overflowWrap="break-word"
                color="#2f4f8f"
                outlineColor="#fff"
                outlineWidth={0.03}
              >
                {`問い: ${sign.question}`}
              </Text>
            </Billboard>
          </Grow>
        </group>
      ))}
    </>
  )
}

export default function World({ rooms }: { rooms: Room[] }) {
  return (
    <>
      {rooms.map((room) => (
        <group key={room.node.id}>
          {room.parent && <Path room={room} />}
          <RoomView room={room} />
          <Questions room={room} />
        </group>
      ))}
    </>
  )
}
