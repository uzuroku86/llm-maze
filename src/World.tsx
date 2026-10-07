import { Billboard, Text } from '@react-three/drei'
import { PATH_LENGTH, PATH_OVERLAP, PATH_WIDTH, pathStart, type Room } from './layout'

const LABEL_HEIGHT = 3.5

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
      <mesh position={[0, 0, -PATH_LENGTH / 2]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[PATH_WIDTH, PATH_LENGTH + PATH_OVERLAP * 2]} />
        <meshStandardMaterial color="#6b7a99" />
      </mesh>
    </group>
  )
}

export default function World({ rooms }: { rooms: Room[] }) {
  return (
    <>
      {rooms.map((room) => {
        const { node, x, z } = room
        return (
          <group key={node.id}>
            {room.parent && <Path room={room} />}
            <mesh position={[x, 0.01, z]} rotation-x={-Math.PI / 2}>
              <circleGeometry args={[room.radius, 48]} />
              <meshStandardMaterial color="#3d4a6b" />
            </mesh>
            {room.depth === 0 ? (
              <Label text={node.label} detail={node.detail} position={[x, 3, z]} fontSize={0.4} maxWidth={8} />
            ) : (
              <Label text={node.label} detail={node.detail} position={[x, LABEL_HEIGHT, z]} />
            )}
          </group>
        )
      })}
    </>
  )
}
