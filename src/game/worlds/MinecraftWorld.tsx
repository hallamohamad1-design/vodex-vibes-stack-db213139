import { Sky } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { PlayerController } from "@/game/PlayerController";
import { MirrorMage } from "@/game/MirrorMage";
import { supabase } from "@/integrations/supabase/client";
import { getMageAI } from "@/game/MirrorMageAI";
import type { BlockType } from "@/game/BlockBuilderHUD";
import type { CounterAction, ActionType } from "@/game/types";

/**
 * MinecraftWorld — Full 3D voxel building world with Stack & Queue mechanics.
 * 
 * Stack: Stores placed blocks for UNDO (press U to undo last block)
 * Queue: Tracks pending block operations in order
 * 
 * Players can build and destroy blocks in a 3D voxel environment.
 */

interface Block {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  type: BlockType;
  placedBy: string;
  timestamp: number;
}

const BLOCK_COLORS: Record<BlockType, string> = {
  grass: "#4caf50",
  dirt: "#7b5230",
  stone: "#757575",
  wood: "#5b3a1d",
  leaves: "#2e7d32",
  water: "#2196f3",
  sand: "#f4e4a6",
  brick: "#b74c3c",
};

const BLOCK_TYPES: BlockType[] = ["grass", "dirt", "stone", "wood", "leaves", "water", "sand", "brick"];

// Stack for block undo (LIFO)
class BlockStack {
  private blocks: Block[] = [];
  readonly capacity = 50;
  
  push(block: Block) {
    this.blocks.push(block);
    if (this.blocks.length > this.capacity) {
      this.blocks.shift();
    }
  }
  
  pop(): Block | null {
    return this.blocks.pop() ?? null;
  }
  
  peek(): Block | null {
    return this.blocks[this.blocks.length - 1] ?? null;
  }
  
  toArray(): Block[] {
    return [...this.blocks];
  }
  
  get size() { return this.blocks.length; }
}

// Queue for block operations (FIFO)
class BlockQueue {
  private blocks: Block[] = [];
  readonly capacity = 30;
  
  enqueue(block: Block) {
    this.blocks.push(block);
    if (this.blocks.length > this.capacity) {
      this.blocks.shift();
    }
  }
  
  dequeue(): Block | null {
    return this.blocks.shift() ?? null;
  }
  
  peek(): Block | null {
    return this.blocks[0] ?? null;
  }
  
  toArray(): Block[] {
    return [...this.blocks];
  }
  
  get size() { return this.blocks.length; }
}

export function MinecraftWorld({ 
  isMultiplayer, 
  role, 
  inviteId, 
  peerName,
  userId,
  username
}: { 
  isMultiplayer?: boolean; 
  role?: string | null; 
  inviteId?: string | null; 
  peerName?: string | null;
  userId?: string;
  username?: string;
}) {
  const playerPos = useRef(new THREE.Vector3(0, 1.7, 8));
  const remotePos = useRef(new THREE.Vector3(6, 1.5, -6));
  const [remoteAction, setRemoteAction] = useState<CounterAction>("ATTACK");
  
  // Block management
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockType, setSelectedBlockType] = useState<BlockType>("grass");
  const blockStackRef = useRef(new BlockStack());
  const blockQueueRef = useRef(new BlockQueue());
  
  // Player actions for recording
  const lastBlockAction = useRef<number>(0);
  const ai = getMageAI("blockworld");
  
  // Generate initial terrain
  useEffect(() => {
    const initialBlocks: Block[] = [];
    const SIZE = 20;
    
    for (let x = -SIZE; x <= SIZE; x++) {
      for (let z = -SIZE; z <= SIZE; z++) {
        // Height based on noise-like function
        const h = Math.floor(
          1 +
          Math.sin(x * 0.25) * 1.2 +
          Math.cos(z * 0.3) * 1.2 +
          Math.sin((x + z) * 0.15) * 0.8
        );
        
        // Top layer (grass or sand near edges)
        const isEdge = Math.abs(x) > SIZE - 3 || Math.abs(z) > SIZE - 3;
        const topType: BlockType = isEdge ? "sand" : "grass";
        
        initialBlocks.push({
          id: `terrain_${x}_${h}_${z}`,
          x, y: h, z,
          color: BLOCK_COLORS[topType],
          type: topType,
          placedBy: "system",
          timestamp: Date.now(),
        });
        
        // Dirt below
        initialBlocks.push({
          id: `terrain_${x}_${h - 1}_${z}`,
          x, y: h - 1, z,
          color: BLOCK_COLORS.dirt,
          type: "dirt",
          placedBy: "system",
          timestamp: Date.now(),
        });
        
        // Stone layer
        initialBlocks.push({
          id: `terrain_${x}_${h - 2}_${z}`,
          x, y: h - 2, z,
          color: BLOCK_COLORS.stone,
          type: "stone",
          placedBy: "system",
          timestamp: Date.now(),
        });
      }
    }
    
    // Add some trees
    for (let i = 0; i < 8; i++) {
      const tx = Math.floor((Math.random() - 0.5) * 30);
      const tz = Math.floor((Math.random() - 0.5) * 30);
      const baseY = 1 + Math.floor(Math.sin(tx * 0.25) * 1.2 + Math.cos(tz * 0.3) * 1.2);
      const treeHeight = 3 + Math.floor(Math.random() * 2);
      
      // Trunk
      for (let y = 0; y < treeHeight; y++) {
        initialBlocks.push({
          id: `tree_${i}_trunk_${y}`,
          x: tx, y: baseY + y + 1, z: tz,
          color: BLOCK_COLORS.wood,
          type: "wood",
          placedBy: "system",
          timestamp: Date.now(),
        });
      }
      
      // Leaves
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          for (let dy = 0; dy <= 1; dy++) {
            if (dx === 0 && dz === 0 && dy === 0) continue;
            initialBlocks.push({
              id: `tree_${i}_leaves_${dx}_${dy}_${dz}`,
              x: tx + dx, y: baseY + treeHeight + dy, z: tz + dz,
              color: BLOCK_COLORS.leaves,
              type: "leaves",
              placedBy: "system",
              timestamp: Date.now(),
            });
          }
        }
      }
    }
    
    setBlocks(initialBlocks);
  }, []);
  
  // Place a block
  const placeBlock = useCallback((x: number, y: number, z: number) => {
    const now = Date.now();
    if (now - lastBlockAction.current < 200) return; // Cooldown
    lastBlockAction.current = now;
    
    const newBlock: Block = {
      id: `block_${now}_${Math.random().toString(36).slice(2)}`,
      x: Math.round(x),
      y: Math.round(y),
      z: Math.round(z),
      color: BLOCK_COLORS[selectedBlockType],
      type: selectedBlockType,
      placedBy: userId || "player",
      timestamp: now,
    };
    
    setBlocks(prev => [...prev, newBlock]);
    blockStackRef.current.push(newBlock);
    blockQueueRef.current.enqueue(newBlock);
    
    // Record action for AI
    ai.observe({
      type: "BUILD",
      damage: 0,
      comboCount: 1,
      wasSuccessful: true,
      world: "blockworld",
    });
    
    // Sync in multiplayer
    if (isMultiplayer && inviteId) {
      supabase.channel(`game_${inviteId}`).send({
        type: "broadcast",
        event: "block_place",
        payload: { block: newBlock, player: username },
      });
    }
  }, [selectedBlockType, userId, username, isMultiplayer, inviteId, ai]);
  
  // Remove a block (mine)
  const mineBlock = useCallback((x: number, y: number, z: number) => {
    const now = Date.now();
    if (now - lastBlockAction.current < 200) return;
    lastBlockAction.current = now;
    
    const targetX = Math.round(x);
    const targetY = Math.round(y);
    const targetZ = Math.round(z);
    
    const blockIndex = blocks.findIndex(b => 
      b.x === targetX && b.y === targetY && b.z === targetZ && b.placedBy !== "system"
    );
    
    if (blockIndex !== -1) {
      setBlocks(prev => prev.filter((_, i) => i !== blockIndex));
      
      // Record action for AI
      ai.observe({
        type: "MINE",
        damage: 10,
        comboCount: 1,
        wasSuccessful: true,
        world: "blockworld",
      });
      
      // Sync in multiplayer
      if (isMultiplayer && inviteId) {
        supabase.channel(`game_${inviteId}`).send({
          type: "broadcast",
          event: "block_mine",
          payload: { x: targetX, y: targetY, z: targetZ, player: username },
        });
      }
    }
  }, [blocks, userId, username, isMultiplayer, inviteId, ai]);
  
  // Undo last placed block (Stack operation)
  const undoBlock = useCallback(() => {
    const lastBlock = blockStackRef.current.pop();
    if (lastBlock) {
      setBlocks(prev => prev.filter(b => b.id !== lastBlock.id));
      
      ai.observe({
        type: "REWIND" as ActionType,
        damage: 0,
        comboCount: 1,
        wasSuccessful: true,
        world: "blockworld",
      });
    }
  }, [ai]);
  
  // Keyboard handler for block operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case "u":
          undoBlock();
          break;
        case "1": setSelectedBlockType("grass"); break;
        case "2": setSelectedBlockType("dirt"); break;
        case "3": setSelectedBlockType("stone"); break;
        case "4": setSelectedBlockType("wood"); break;
        case "5": setSelectedBlockType("leaves"); break;
        case "6": setSelectedBlockType("water"); break;
        case "7": setSelectedBlockType("sand"); break;
        case "8": setSelectedBlockType("brick"); break;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoBlock]);
  
  // Multiplayer sync
  useEffect(() => {
    if (!isMultiplayer || !inviteId) return;
    
    const channel = supabase.channel(`game_${inviteId}`);
    
    channel
      .on("broadcast", { event: "player_state" }, (payload) => {
        if (payload.payload.pos) {
          remotePos.current.set(payload.payload.pos[0], payload.payload.pos[1], payload.payload.pos[2]);
        }
        if (payload.payload.action) {
          setRemoteAction(payload.payload.action as CounterAction);
        }
      })
      .on("broadcast", { event: "block_place" }, (payload) => {
        const { block } = payload.payload;
        setBlocks(prev => [...prev, block]);
      })
      .on("broadcast", { event: "block_mine" }, (payload) => {
        const { x, y, z } = payload.payload;
        setBlocks(prev => prev.filter(b => !(b.x === x && b.y === y && b.z === z)));
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isMultiplayer, inviteId]);
  
  // Click to place/mine blocks — handled via keyboard (Q/E) in PlayerController
  // Raycasting-based click placement can be added in a future iteration
  
  // Group blocks by color for instanced rendering
  const blocksByColor = useMemo(() => {
    const map = new Map<string, Block[]>();
    blocks.forEach(b => {
      const existing = map.get(b.color) || [];
      existing.push(b);
      map.set(b.color, existing);
    });
    return map;
  }, [blocks]);

  return (
    <>
      <fog attach="fog" args={["#87ceeb", 40, 120]} />
      <color attach="background" args={["#87ceeb"]} />
      <Sky sunPosition={[100, 80, 100]} turbidity={2} rayleigh={1} />
      
      <ambientLight intensity={0.7} />
      <directionalLight 
        position={[30, 50, 30]} 
        intensity={1.2} 
        color="#ffffff" 
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      
      {/* Render blocks grouped by color for performance */}
      {Array.from(blocksByColor.entries()).map(([color, colorBlocks]) => (
        <group key={color}>
          {colorBlocks.map((block) => (
            <mesh
              key={block.id}
              position={[block.x, block.y, block.z]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial 
                color={block.color} 
                roughness={block.type === "water" ? 0.1 : 0.9}
                transparent={block.type === "water"}
                opacity={block.type === "water" ? 0.7 : 1}
              />
            </mesh>
          ))}
        </group>
      ))}
      
      <PlayerController 
        worldId="blockworld" 
        bounds={28} 
        onPlayerMoved={(p) => playerPos.current.copy(p)} 
        isMultiplayer={isMultiplayer}
        inviteId={inviteId}
      />
      
      <MirrorMage 
        playerPos={isMultiplayer ? remotePos : playerPos} 
        worldId="blockworld" 
        color={role === "host" ? "#5b3a1d" : "#4b2513"} 
        variant={isMultiplayer ? (role === "host" ? "golem" : "mage") : "golem"} 
        isRemote={isMultiplayer}
        remoteAction={isMultiplayer ? remoteAction : undefined}
        name={isMultiplayer ? peerName || "Operative" : undefined}
      />
    </>
  );
}
