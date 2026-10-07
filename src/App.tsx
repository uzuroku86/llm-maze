import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import Player from './Player'
import World, { getPathDirection, isWalkable } from './World'
import { thoughtGraph } from './thoughtGraph'

export default function App() {
  const [locked, setLocked] = useState(false)

  return (
    <>
      <Canvas
        camera={{ fov: 70, position: [0, 1.6, 4] }}
        onCreated={({ camera }) => camera.lookAt(0, 1.6, 0)}
      >
        <color attach="background" args={['#ffffff']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} />
        <World root={thoughtGraph} />
        <Player
          isWalkable={(x, z) => isWalkable(thoughtGraph, x, z)}
          getPathDirection={(x, z) => getPathDirection(thoughtGraph, x, z)}
        />
        <PointerLockControls
          onLock={() => setLocked(true)}
          onUnlock={() => setLocked(false)}
        />
      </Canvas>
      {!locked && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            fontFamily: 'sans-serif',
            pointerEvents: 'none',
            textShadow: '0 0 8px #fff',
          }}
        >
          クリックで開始 / WASD/矢印キー: 移動 / マウス: 視点 / ESC: 解除
        </div>
      )}
    </>
  )
}
