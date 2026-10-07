import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import Player from './Player'
import World from './World'
import { MAX_BRANCHES, getPathDirection, isWalkable, layoutGraph, nearestRoom, type Room } from './layout'
import type { ThoughtNode } from './thoughtGraph'
import { streamThought } from './think'

const emptyGraph: ThoughtNode = { id: 'root', label: '', branches: [] }

const addBranch = (
  node: ThoughtNode,
  parentId: string,
  branch: { label: string; detail?: string },
): ThoughtNode => {
  if (node.id === parentId) {
    const branches = node.branches ?? []
    if (branches.length >= MAX_BRANCHES) return node
    return { ...node, branches: [...branches, { id: `${node.id}.${branches.length}`, ...branch }] }
  }
  return { ...node, branches: node.branches?.map((child) => addBranch(child, parentId, branch)) }
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#000',
  fontFamily: 'sans-serif',
  pointerEvents: 'none',
  textShadow: '0 0 8px #fff',
} as const

export default function App() {
  const [graph, setGraph] = useState<ThoughtNode>(emptyGraph)
  const [locked, setLocked] = useState(false)
  const [asking, setAsking] = useState(true)
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState('')
  const controls = useRef<ComponentRef<typeof PointerLockControls>>(null)
  const abort = useRef<AbortController | null>(null)
  const playerPosition = useRef({ x: 0, z: 4 })
  const rooms = useMemo(() => layoutGraph(graph), [graph])

  const openInput = () => {
    controls.current?.unlock()
    setAsking(true)
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat || asking) return
      openInput()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [asking])

  const currentRoom = () => nearestRoom(rooms, playerPosition.current.x, playerPosition.current.z)

  const ask = async (question: string) => {
    const isFirst = !graph.label
    const target = currentRoom()
    if (!isFirst && (target.node.branches?.length ?? 0) >= MAX_BRANCHES) {
      setAsking(false)
      setError('この部屋からはこれ以上道を増やせません')
      return
    }

    const path: { label: string; detail?: string }[] = []
    if (!isFirst) {
      for (let room: Room | null = target; room; room = room.parent) {
        path.unshift({ label: room.node.label, detail: room.node.detail })
      }
    }

    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller

    if (isFirst) setGraph((g) => ({ ...g, label: '考え中…' }))
    setAsking(false)
    setError('')
    setThinking(true)

    let received = 0
    try {
      await streamThought(
        question,
        path,
        (node) => {
          if (isFirst && received++ === 0) {
            setGraph((g) => ({ ...g, ...node }))
          } else {
            setGraph((g) => addBranch(g, target.node.id, node))
          }
        },
        controller.signal,
      )
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : String(e))
      if (isFirst) setGraph((g) => (g.label === '考え中…' ? { ...g, label: '' } : g))
    } finally {
      if (abort.current === controller) setThinking(false)
    }
  }

  return (
    <>
      <Canvas camera={{ fov: 70, position: [0, 1.6, 4] }}>
        <color attach="background" args={['#ffffff']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} />
        <World rooms={rooms} />
        <Player
          positionRef={playerPosition}
          isWalkable={(x, z) => isWalkable(rooms, x, z)}
          getPathDirection={(x, z) => getPathDirection(rooms, x, z)}
        />
        <PointerLockControls
          ref={controls}
          selector="canvas"
          onLock={() => {
            setLocked(true)
            setAsking(false)
          }}
          onUnlock={() => setLocked(false)}
        />
      </Canvas>
      {(thinking || error) && (
        <div style={{ ...overlayStyle, alignItems: 'flex-start', paddingTop: 16 }}>
          {error || '考え中…'}
        </div>
      )}
      {!locked && !asking && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 8,
            maxWidth: 360,
            color: '#000',
            fontFamily: 'sans-serif',
            fontSize: 14,
            textAlign: 'right',
            pointerEvents: 'none',
            textShadow: '0 0 8px #fff',
          }}
        >
          クリックで開始 / WASD/矢印キー: 移動 / マウス: 視点 / Enter: 相談する / ESC: 解除
          <button style={{ pointerEvents: 'auto', padding: '6px 16px', fontSize: 14 }} onClick={openInput}>
            相談する
          </button>
        </div>
      )}
      {asking && (
        <form
          style={{ ...overlayStyle, pointerEvents: 'none' }}
          onSubmit={(e) => {
            e.preventDefault()
            const question = String(new FormData(e.currentTarget).get('question') ?? '').trim()
            if (question) void ask(question)
          }}
        >
          <input
            name="question"
            autoFocus
            autoComplete="off"
            placeholder={
              graph.label
                ? `「${currentRoom().node.label}」についてさらに考えたいことを入力して Enter`
                : '相談したいことを入力して Enter'
            }
            style={{ pointerEvents: 'auto', width: 560, padding: 12, fontSize: 18 }}
          />
        </form>
      )}
    </>
  )
}
