"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"

function NeuralNetwork() {

  const group = useRef<THREE.Group>(null!)

  const nodes:number[][] = []

  for (let i = 0; i < 80; i++) {
    nodes.push([
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6
    ])
  }

  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.y = clock.elapsedTime * 0.08
      group.current.rotation.x = Math.sin(clock.elapsedTime * 0.2) * 0.2
    }
  })

  return (

    <group ref={group}>

      {nodes.map((pos, i) => (

        <mesh key={i} position={pos as any}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="#7c3aed" />
        </mesh>

      ))}

      {nodes.map((a, i) =>
        nodes.slice(i + 1).map((b, j) => {

          const distance = Math.sqrt(
            (a[0] - b[0]) ** 2 +
            (a[1] - b[1]) ** 2 +
            (a[2] - b[2]) ** 2
          )

          if (distance > 2.5) return null

          const points = [
            new THREE.Vector3(...a),
            new THREE.Vector3(...b)
          ]

          const geometry = new THREE.BufferGeometry().setFromPoints(points)

          return (
            <line key={`${i}-${j}`}>
              <bufferGeometry attach="geometry" {...geometry} />
              <lineBasicMaterial
                color="#8b5cf6"
                transparent
                opacity={0.2}
              />
            </line>
          )

        })
      )}

    </group>

  )
}

export default function NeuralBackground() {

  return (

    <div className="absolute inset-0 -z-10">

      <Canvas camera={{ position: [0, 0, 6] }}>

        <NeuralNetwork />

      </Canvas>

    </div>

  )
}