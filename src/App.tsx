import { useEffect, useRef, useState, type ComponentRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import Player from './Player'
import World, { MAX_BRANCHES, getPathDirection, isWalkable } from './World'
import { thoughtGraph, type ThoughtNode } from './thoughtGraph'
import { streamThought } from './think'

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
  const [graph, setGraph] = useState<ThoughtNode>(thoughtGraph)
  const [session, setSession] = useState(0)
  const [locked, setLocked] = useState(false)
  const [asking, setAsking] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState('')
  const controls = useRef<ComponentRef<typeof PointerLockControls>>(null)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Enter' || !locked) return
      controls.current?.unlock()
      setAsking(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [locked])

  const ask = async (question: string) => {
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller

    setGraph({ id: 'root', label: '考え中…', branches: [] })
    setSession((n) => n + 1)
    setAsking(false)
    setError('')
    setThinking(true)

    let received = 0
    try {
      await streamThought(
        question,
        (node) => {
          const index = received++
          if (index === 0) {
            setGraph((g) => ({ ...g, ...node }))
          } else if (index <= MAX_BRANCHES) {
            setGraph((g) => ({ ...g, branches: [...(g.branches ?? []), { id: `b${index}`, ...node }] }))
          }
        },
        controller.signal,
      )
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : String(e))
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
        <World root={graph} />
        <Player
          session={session}
          isWalkable={(x, z) => isWalkable(graph, x, z)}
          getPathDirection={(x, z) => getPathDirection(graph, x, z)}
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
        <div style={overlayStyle}>
          クリックで開始 / WASD/矢印キー: 移動 / マウス: 視点 / Enter: 相談する / ESC: 解除
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
            placeholder="相談したいことを入力して Enter"
            style={{ pointerEvents: 'auto', width: 480, padding: 12, fontSize: 18 }}
          />
        </form>
      )}
    </>
  )
}
