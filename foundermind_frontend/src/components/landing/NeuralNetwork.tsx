"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { useRef, useEffect, useState } from "react"
import * as THREE from "three"

function NeuralNetwork() {

  const group = useRef<THREE.Group>(null!)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {

    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener("scroll", handleScroll)

    return () => window.removeEventListener("scroll", handleScroll)

  }, [])

  const nodes:number[][]=[]

  for(let i=0;i<80;i++){
    nodes.push([
      (Math.random()-.5)*10,
      (Math.random()-.5)*6,
      (Math.random()-.5)*6
    ])
  }

  useFrame(() => {

    if(group.current){

      group.current.rotation.y = scrollY * 0.0005
      group.current.rotation.x = scrollY * 0.0002

    }

  })

  return(
    <group ref={group}>
      {nodes.map((pos,i)=>(
        <mesh key={i} position={pos as any}>
          <sphereGeometry args={[0.05,16,16]} />
          <meshBasicMaterial color="#7c3aed"/>
        </mesh>
      ))}
    </group>
  )
}