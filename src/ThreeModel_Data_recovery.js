import React from "react"
import "./ThreeModel.css"
import { Rnd } from "react-rnd"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Plane } from "@react-three/drei"
import * as THREE from "three"
import chroma from "chroma-js"

function DEM({ georaster }) {
  const ref = React.useRef()
  const scale = chroma
    .scale("Spectral")
    .domain([georaster.mins[0], georaster.maxs[0]])

  const size = georaster.width * georaster.height
  const colors = new Uint8Array(4 * size)
  const heightMap = new Uint8ClampedArray(4 * size)

  const texture = React.useMemo(
    () => new THREE.DataTexture(colors, georaster.width, georaster.height),
    [colors, georaster]
  )
  const displacementMap = React.useMemo(
    () => new THREE.DataTexture(heightMap, georaster.width, georaster.height),
    [heightMap, georaster]
  )

  georaster.values[0].map((row, j) =>
    row.map((val, i) => {
      const [r, g, b] = scale(val).rgb()

      colors[4 * (j * georaster.width + i)] = r
      colors[4 * (j * georaster.width + i) + 1] = g
      colors[4 * (j * georaster.width + i) + 2] = b
      colors[4 * (j * georaster.width + i) + 3] = 155
      heightMap[4 * (j * georaster.width + i)] = Math.floor(
        ((val - georaster.mins[0]) / (georaster.maxs[0] - georaster.mins[0])) *
          255
      )
      heightMap[4 * (j * georaster.width + i) + 1] = Math.floor(
        ((val - georaster.mins[0]) / (georaster.maxs[0] - georaster.mins[0])) *
          255
      )
      heightMap[4 * (j * georaster.width + i) + 2] = Math.floor(
        ((val - georaster.mins[0]) / (georaster.maxs[0] - georaster.mins[0])) *
          255
      )
      heightMap[4 * (j * georaster.width + i) + 3] = 255

      displacementMap.needsUpdate = true
      texture.needsUpdate = true
    })
  )

  return (
    <Plane
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -3, 0]}
      args={[
        georaster.width,
        georaster.height,
        georaster.width - 1,
        georaster.height - 1,
      ]}
    >
      <meshStandardMaterial
        ref={ref}
        attach="material"
        color="white"
        map={texture}
        metalness={0.2}
        displacementMap={displacementMap}
        displacementScale={100}
      />
    </Plane>
  )
}

function ThreeModel_Data_recovery({ map }) {
  const layers = Object.values(map._layers).find((v) => v.overlayId === "42")
  const georaster = layers?.georasters[0]

  return (
    <Rnd
      dragHandleClassName="drag"
      default={{ x: 460, y: 0, width: 300, height: 300 }}
      style={{
        backgroundColor: "white",
        zIndex: 999,
        border: "solid black 2px",
      }}
    >
      <Canvas>
        <OrbitControls/>
        <ambientLight intensity={1} />
        <spotLight position={[2000, 2000, 2000]} angle={0.16} penumbra={0.1} />
        <React.Suspense fallback={null}>
          <DEM georaster={georaster} />
        </React.Suspense>
      </Canvas>
    </Rnd>
  )
}

export default ThreeModel_Data_recovery
