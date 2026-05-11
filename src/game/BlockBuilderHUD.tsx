/**
 * BlockBuilderHUD — Heads-up display for Minecraft/Blockworld building.
 * 
 * Shows:
 * - Selected block type
 * - Stack size (for undo)
 * - Queue size (history)
 * - Block type selector
 * - Undo button
 */

import { cn } from "@/lib/utils";
import type { BlockType } from "@/game/worlds/BlockWorld";

interface Props {
  selectedBlockType: BlockType;
  stackSize: number;
  queueSize: number;
  onSelectBlock: (type: BlockType) => void;
  onUndo: () => void;
}

const BLOCK_TYPES: { id: BlockType; label: string; color: string; icon: string }[] = [
  { id: "grass",  label: "GRASS",  color: "#4caf50", icon: "▓" },
  { id: "dirt",   label: "DIRT",   color: "#7b5230", icon: "░" },
  { id: "stone",  label: "STONE",  color: "#757575", icon: "█" },
  { id: "wood",   label: "WOOD",   color: "#5b3a1d", icon: "▌" },
  { id: "leaves", label: "LEAVES", color: "#2e7d32", icon: "♠" },
  { id: "water",  label: "WATER",  color: "#2196f3", icon: "≋" },
  { id: "sand",   label: "SAND",   color: "#f4e4a6", icon: "▫" },
  { id: "brick",  label: "BRICK",  color: "#b74c3c", icon: "▪" },
];

export function BlockBuilderHUD({ 
  selectedBlockType, 
  stackSize, 
  queueSize, 
  onSelectBlock, 
  onUndo 
}: Props) {
  const selected = BLOCK_TYPES.find(b => b.id === selectedBlockType) ?? BLOCK_TYPES[0];

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
      {/* Stack & Queue stats */}
      <div className="flex gap-4 mb-1">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/10 border border-secondary/30">
          <span className="font-mono text-[9px] text-secondary/70 uppercase tracking-widest">STACK</span>
          <span className="font-mono text-sm text-secondary font-bold">{stackSize}</span>
          <span className="font-mono text-[8px] text-muted-foreground/50">(UNDO)</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/30">
          <span className="font-mono text-[9px] text-primary/70 uppercase tracking-widest">QUEUE</span>
          <span className="font-mono text-sm text-primary font-bold">{queueSize}</span>
          <span className="font-mono text-[8px] text-muted-foreground/50">(HISTORY)</span>
        </div>
      </div>

      {/* Block type selector */}
      <div className="panel p-2 backdrop-blur-md">
        <div className="flex items-center gap-1">
          {BLOCK_TYPES.map((block, idx) => (
            <button
              key={block.id}
              onClick={() => onSelectBlock(block.id)}
              className={cn(
                "relative flex flex-col items-center justify-center w-12 h-12 rounded-md border transition-all",
                selectedBlockType === block.id
                  ? "border-primary bg-primary/20 shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                  : "border-white/10 bg-black/30 hover:border-white/30"
              )}
              title={`${block.label} [${idx + 1}]`}
            >
              <span 
                className="text-lg font-mono" 
                style={{ color: block.color }}
              >
                {block.icon}
              </span>
              <span className="absolute bottom-0.5 right-0.5 font-mono text-[7px] text-muted-foreground/60">
                {idx + 1}
              </span>
              {selectedBlockType === block.id && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Controls hint */}
      <div className="flex items-center gap-3 mt-1">
        <div className="font-mono text-[8px] text-muted-foreground/50">
          <span className="text-primary">Q</span> Place · 
          <span className="text-primary"> E</span> Mine · 
          <span className="text-secondary"> U</span> Undo
        </div>
      </div>

      {/* Selected block info */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 border border-white/10">
        <span 
          className="w-4 h-4 rounded border border-white/20" 
          style={{ backgroundColor: selected.color }}
        />
        <span className="font-mono text-[10px] text-foreground uppercase tracking-widest">
          {selected.label}
        </span>
      </div>
    </div>
  );
}
