import { Sky } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { PlayerController } from "@/game/PlayerController";
import { MirrorMage } from "@/game/MirrorMage";
import { supabase } from "@/integrations/supabase/client";
import { getMageAI } from "@/game/MirrorMageAI";
import type { BlockType } from "@/game/BlockBuilderHUD";
import type { CounterAction, ActionType } from "@/game/types";

export type { BlockType };

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

// Stack for block undo (LIFO) - player can undo last placed block
class BlockStack {
  private blocks: Block[] = [];
  readonly capacity = 50;
  
  push(block: Block) {
    this.blocks.push(block);
    if (this.blocks.length > this.capacity) {
      this.blocks.shift(); // Evict oldest when full
    }
  }
  
  pop(): Block | null {
    return this.blocks.pop() ?? null;
  }
  
  peek(): Block | null {
    return this.blocks[this.blocks.length - 1] ?? null;
  }
  
  remove(id: string) {
    this.blocks = this.blocks.filter(b => b.id !== id);
  }
  
  toArray(): Block[] {
    return [...this.blocks];
  }
  
  get size() { return this.blocks.length; }
}

// Queue for block operations (FIFO) - chronological order
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

export function BlockWorld({ 
  isMultiplayer, 
  role, 
  inviteId, 
  peerName
}: { 
  isMultiplayer?: boolean; 
  role?: string | null; 
  inviteId?: string | null; 
  peerName?: string | null;
}) {
  const playerPos = useRef(new THREE.Vector3(0, 1.7, 8));
  const remotePos = useRef(new THREE.Vector3(6, 1.5, -6));
  const [remoteAction, setRemoteAction] = useState<CounterAction>("ATTACK");
  
  // Block management with Stack and Queue
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockType, setSelectedBlockType] = useState<BlockType>("grass");
  const blockStackRef = useRef(new BlockStack());
  const blockQueueRef = useRef(new BlockQueue());
  
  // Placement preview
  const [previewPos, setPreviewPos] = useState<[number, number, number] | null>(null);
  
  // Action cooldown
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
        
        // Dirt below top
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
    
    // Add trees
    const treePositions = [
      [-8, -5], [5, -10], [-12, 8], [10, 5], [-5, 12], [15, -8], [-15, -15], [8, 15]
    ];
    
    treePositions.forEach(([tx, tz], i) => {
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
      
      // Leaves cluster
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
    });
    
    setBlocks(initialBlocks);
  }, []);
  
  // Place a block (BUILD action)
  const placeBlock = useCallback((x: number, y: number, z: number) => {
    const now = Date.now();
    if (now - lastBlockAction.current < 200) return;
    lastBlockAction.current = now;
    
    // Check if position is already occupied
    const isOccupied = blocks.some(b => 
      Math.abs(b.x - Math.round(x)) < 0.5 && 
      Math.abs(b.y - Math.round(y)) < 0.5 && 
      Math.abs(b.z - Math.round(z)) < 0.5
    );
    
    if (isOccupied) return;
    
    const newBlock: Block = {
      id: `player_${now}_${Math.random().toString(36).slice(2)}`,
      x: Math.round(x),
      y: Math.round(y),
      z: Math.round(z),
      color: BLOCK_COLORS[selectedBlockType],
      type: selectedBlockType,
      placedBy: "local_player",
      timestamp: now,
    };
    
    setBlocks(prev => [...prev, newBlock]);
    blockStackRef.current.push(newBlock); // Add to stack for undo
    blockQueueRef.current.enqueue(newBlock); // Add to queue for history
    
    // Record BUILD action for AI and game history
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
        payload: { block: newBlock },
      });
    }
  }, [blocks, selectedBlockType, isMultiplayer, inviteId, ai]);
  
  // Remove a block (MINE action)
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
      const removedBlock = blocks[blockIndex];
      setBlocks(prev => prev.filter((_, i) => i !== blockIndex));
      
      // Remove from stack if present
      blockStackRef.current.remove(removedBlock.id);
      
      // Record MINE action for AI
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
          payload: { x: targetX, y: targetY, z: targetZ, blockId: removedBlock.id },
        });
      }
    }
  }, [blocks, isMultiplayer, inviteId, ai]);
  
  // Undo last placed block (Stack LIFO operation)
  const undoBlock = useCallback(() => {
    const lastBlock = blockStackRef.current.pop();
    if (lastBlock) {
      setBlocks(prev => prev.filter(b => b.id !== lastBlock.id));
      
      // Record undo as REWIND action (uses the stack)
      ai.observe({
        type: "REWIND" as ActionType,
        damage: 0,
        comboCount: 1,
        wasSuccessful: true,
        world: "blockworld",
      });
    }
  }, [ai]);
  
  // Get next queued block (Queue FIFO operation)
  const peekQueue = useCallback(() => {
    return blockQueueRef.current.peek();
  }, []);
  
  // Keyboard handler for block operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Block type selection (1-8)
      if (key >= "1" && key <= "8") {
        const index = parseInt(key) - 1;
        if (index < BLOCK_TYPES.length) {
          setSelectedBlockType(BLOCK_TYPES[index]);
        }
      }
      
      // Undo (U key)
      if (key === "u") {
        undoBlock();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoBlock]);
  
  // Place block in front of player when Q is pressed
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "q") {
        // Place block 2 units in front of player
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(playerPos.current.clone().normalize());
        const placeX = playerPos.current.x + forward.x * 2;
        const placeY = Math.max(1, Math.round(playerPos.current.y) - 1);
        const placeZ = playerPos.current.z + forward.z * 2;
        placeBlock(placeX, placeY, placeZ);
      }
      
      if (e.key.toLowerCase() === "e") {
        // Mine block in front of player
        const forward = new THREE.Vector3(0, 0, -1);
        const mineX = playerPos.current.x;
        const mineY = Math.max(1, Math.round(playerPos.current.y) - 1);
        const mineZ = playerPos.current.z - 2;
        mineBlock(mineX, mineY, mineZ);
      }
    };
    
    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, [placeBlock, mineBlock]);
  
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
        setBlocks(prev => {
          // Avoid duplicates
          if (prev.some(b => b.id === block.id)) return prev;
          return [...prev, block];
        });
      })
      .on("broadcast", { event: "block_mine" }, (payload) => {
        const { x, y, z, blockId } = payload.payload;
        setBlocks(prev => prev.filter(b => b.id !== blockId || !(b.x === x && b.y === y && b.z === z)));
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isMultiplayer, inviteId]);

  return (
    <>
      <fog attach="fog" args={["#bfd9ff", 30, 90]} />
      <color attach="background" args={["#87ceeb"]} />
      <Sky sunPosition={[80, 60, 80]} turbidity={2} rayleigh={1} />
      
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[20, 40, 20]} 
        intensity={1.5} 
        color="#ffffff" 
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      
      {/* Render all blocks */}
      {blocks.map((block) => (
        <mesh
          key={block.id}
          position={[block.x, block.y, block.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial 
            color={block.color} 
            roughness={block.type === "water" ? 0.1 : 0.95}
            transparent={block.type === "water"}
            opacity={block.type === "water" ? 0.7 : 1}
          />
        </mesh>
      ))}
      
      {/* Block preview (where next block will be placed) */}
      {previewPos && (
        <mesh position={previewPos}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={BLOCK_COLORS[selectedBlockType]} wireframe opacity={0.5} transparent />
        </mesh>
      )}
      
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
        color={role === "host" ? "#8b4513" : "#4b2513"} 
        variant={isMultiplayer ? (role === "host" ? "golem" : "mage") : "golem"} 
        isRemote={isMultiplayer}
        remoteAction={isMultiplayer ? remoteAction : undefined}
        name={isMultiplayer ? peerName || "Operative" : undefined}
      />
    </>
  );
}
