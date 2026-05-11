export type World = {
  id: string;
  name: string;
  emoji: string;
  description: string;
};

export const WORLDS: World[] = [
  { id: "ember-wastes", name: "Ember Wastes", emoji: "🔥", description: "Scorched dunes and ash storms" },
  { id: "frost-citadel", name: "Frost Citadel", emoji: "❄️", description: "An icy fortress above the clouds" },
  { id: "shadow-marsh", name: "Shadow Marsh", emoji: "🌫️", description: "Whispering bogs and pale lanterns" },
  { id: "arcane-spire", name: "Arcane Spire", emoji: "🔮", description: "Where ley lines split the sky" },
  { id: "verdant-ruins", name: "Verdant Ruins", emoji: "🌿", description: "Vines reclaim a fallen empire" },
];

export const CHARACTER_CLASSES = [
  { id: "warrior", name: "Warrior", emoji: "⚔️" },
  { id: "mage", name: "Mage", emoji: "🔮" },
  { id: "rogue", name: "Rogue", emoji: "🗡️" },
  { id: "ranger", name: "Ranger", emoji: "🏹" },
  { id: "cleric", name: "Cleric", emoji: "✨" },
];

export const ACTION_KINDS = [
  { id: "attack", label: "Strike", emoji: "⚔️" },
  { id: "defend", label: "Guard", emoji: "🛡️" },
  { id: "special", label: "Cast Spell", emoji: "✨" },
  { id: "predicted", label: "Predict", emoji: "🔮" },
  { id: "counter", label: "Counter", emoji: "↩️" },
] as const;
