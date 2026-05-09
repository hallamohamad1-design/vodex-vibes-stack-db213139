import { Sky } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { PlayerController } from "@/game/PlayerController";
import { MirrorMage } from "@/game/MirrorMage";

/** Blockworld — Minecraft-style voxel terrain with blocky trees. */
export function BlockWorld() {
  const playerPos = useRef(new THREE.Vector3(0, 1.7, 8));

  // generate a small heightmap of grass blocks
  const blocks = useMemo(() => {
    const out: { x: number; y: number; z: number; color: string }[] = [];
    const SIZE = 30;
    for (let x = -SIZE; x <= SIZE; x++) {
      for (let z = -SIZE; z <= SIZE; z++) {
        // simple wave-based heightmap
        const h = Math.floor(
          1 +
            Math.sin(x * 0.25) * 1.2 +
            Math.cos(z * 0.3) * 1.2 +
            Math.sin((x + z) * 0.15) * 0.8
        );
        out.push({ x, y: h, z, color: "#4caf50" });
        // dirt below
        out.push({ x, y: h - 1, z, color: "#7b5230" });
      }
    }
    return out;
  }, []);

  // trees (oak-like)
  const trees = useMemo(
    () => Array.from({ length: 10 }).map(() => ({
      x: Math.floor((Math.random() - 0.5) * 50),
      z: Math.floor((Math.random() - 0.5) * 50),
      h: 3 + Math.floor(Math.random() * 2),
    })),
    []
  );

  // Use instanced mesh for terrain (perf)
  const terrainRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useMemo(() => {
    if (!terrainRef.current) return;
    blocks.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z);
      dummy.updateMatrix();
      terrainRef.current!.setMatrixAt(i, dummy.matrix);
      terrainRef.current!.setColorAt(i, new THREE.Color(b.color));
    });
    terrainRef.current.instanceMatrix.needsUpdate = true;
    if (terrainRef.current.instanceColor) terrainRef.current.instanceColor.needsUpdate = true;
  }, [blocks, dummy]);

  return (
    <>
      <fog attach="fog" args={["#bfd9ff", 30, 90]} />
      <color attach="background" args={["#87ceeb"]} />
      <Sky sunPosition={[80, 60, 80]} turbidity={2} rayleigh={1} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[20, 40, 20]} intensity={1.5} color="#ffffff" castShadow />

      {/* terrain (instanced) */}
      <instancedMesh ref={terrainRef} args={[undefined, undefined, blocks.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>

      {/* trees */}
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 2, t.z]}>
          {/* trunk */}
          {Array.from({ length: t.h }).map((_, j) => (
            <mesh key={j} position={[0, j, 0]} castShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#5b3a1d" roughness={1} />
            </mesh>
          ))}
          {/* leaves cube cluster */}
          {[
            [0, t.h, 0], [1, t.h, 0], [-1, t.h, 0], [0, t.h, 1], [0, t.h, -1],
            [0, t.h + 1, 0], [1, t.h + 1, 1], [-1, t.h + 1, -1], [1, t.h + 1, -1], [-1, t.h + 1, 1],
          ].map(([x, y, z], k) => (
            <mesh key={k} position={[x, y, z]} castShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#2e7d32" roughness={1} />
            </mesh>
          ))}
        </group>
      ))}

      <PlayerController worldId="blockworld" bounds={28} onPlayerMoved={(p) => playerPos.current.copy(p)} />
      <MirrorMage playerPos={playerPos} worldId="blockworld" color="#8b4513" variant="golem" />
    </>
  );
}
