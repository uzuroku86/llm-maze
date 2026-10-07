import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

const SPEED = 6
const EYE_HEIGHT = 1.6
const UP = new Vector3(0, 1, 0)

type Props = {
  session: number
  isWalkable: (x: number, z: number) => boolean
  getPathDirection: (x: number, z: number) => { x: number; z: number } | null
}

export default function Player({ session, isWalkable, getPathDirection }: Props) {
  const keys = useRef(new Set<string>())
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    camera.position.set(0, EYE_HEIGHT, 4)
    camera.lookAt(0, EYE_HEIGHT, 0)
  }, [camera, session])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      keys.current.add(e.code)
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame((_, delta) => {
    const k = keys.current
    const forward = new Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()

    const path = getPathDirection(camera.position.x, camera.position.z)
    if (path) {
      const axis = new Vector3(path.x, 0, path.z)
      forward.copy(axis.dot(forward) >= 0 ? axis : axis.negate())
    }
    const right = new Vector3().crossVectors(forward, UP)

    const move = new Vector3()
    if (k.has('KeyW') || k.has('ArrowUp')) move.add(forward)
    if (k.has('KeyS') || k.has('ArrowDown')) move.sub(forward)
    if (k.has('KeyD') || k.has('ArrowRight')) move.add(right)
    if (k.has('KeyA') || k.has('ArrowLeft')) move.sub(right)
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(SPEED * delta)
      const { x, z } = camera.position
      if (isWalkable(x + move.x, z + move.z)) {
        camera.position.x += move.x
        camera.position.z += move.z
      } else if (isWalkable(x + move.x, z)) {
        camera.position.x += move.x
      } else if (isWalkable(x, z + move.z)) {
        camera.position.z += move.z
      }
    }
    camera.position.y = EYE_HEIGHT
  })

  return null
}
