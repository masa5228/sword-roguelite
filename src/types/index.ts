// 設計書 §25 データモデル

export type SwordType = "longSword" | "greatSword" | "rapier" | "katana" | "twinBlade" | "battleAxe" | "warHammer" | "spear" | "whipBlade" | "crystalSword" | "cursedBlade" | "sunBlade" | "arcaneStaff";
export type SwordRarity = "common" | "rare" | "epic"; // MVPは3段階 (§9.2)
export type EffectType = "burn" | "poison" | "lifesteal";

export type CharacterType = "renon" | "hinata" | "kanata" | "rin";

export interface Character {
  type: CharacterType;
  name: string;
  attackMultiplier: number;
  attackSpeedMultiplier: number;
  chargeTimeMultiplier: number;
  chargeMultiplier: number;
  hpMultiplier: number;
  criticalRateMultiplier: number;
  criticalMultiplierMultiplier: number;
}

export interface SwordEffect {
  type: EffectType;
  level: number;
}

export interface Sword {
  id: string;
  name: string;
  type: SwordType;
  rarity: SwordRarity;
  level: number; // 強化レベル合計
  attack: number;
  attackSpeed: number; // 回/秒
  criticalRate: number; // 0..1
  criticalMultiplier: number;
  chargeMultiplier: number; // 最大溜め倍率
  knockback: number;
  effects: SwordEffect[];
  basePrice: number;
  spentCoins: number; // 累計強化費用 (§11.4 売却価格算出用)
  sellPrice: number;
}

export type EnemyKind = "slime" | "goblin" | "skeleton" | "orc" | "mage" | "bossKnight";
export type EliteEffect = "giant" | "frenzy" | "regen"; // MVP 3種 (§12.4)
export type EnemyRole = "normal" | "strong" | "elite" | "boss";

export interface Enemy {
  id: string;
  name: string;
  type: EnemyKind;
  role: EnemyRole;
  floor: number;
  maxHp: number;
  currentHp: number;
  attack: number;
  attackInterval: number; // 秒
  staggerResistance: number;
  coinMultiplier: number;
  dropMultiplier: number;
  eliteEffects: EliteEffect[];
}

// §25.3 RunState
export interface RunState {
  floor: number;
  playerHp: number;
  playerMaxHp: number;
  defense: number;
  dodgeCharges: number;
  coins: number;
  equippedSword: Sword;
  character: Character;
  defeatedEnemies: number;
  defeatedBosses: number;
  totalCoinsEarned: number;
  maxDamage: number;
  startedAt: number;
  bestRarityFound: SwordRarity | null;
  seed: number;
}

// §22.1 永続セーブデータ
export interface Settings {
  bgmVolume: number;
  seVolume: number;
  vibration: boolean;
  graphicsQuality: "auto" | "high" | "low";
}

export interface SaveData {
  highestFloor: number;
  maxKills: number;
  discoveredSwords: string[]; // 図鑑キー: `${type}:${rarity}`
  discoveredEnemies: string[]; // EnemyKind + elite種
  achievements: string[];
  settings: Settings;
  tutorialCompleted: boolean;
}

// §22.3 プレイ中断セーブ（階層開始時点）
export interface SuspendData {
  run: RunState;
  savedAt: number;
}

export interface ResultData {
  floor: number;
  kills: number;
  bossKills: number;
  totalCoins: number;
  maxDamage: number;
  swordName: string;
  bestRarity: SwordRarity | null;
  playTimeMs: number;
  newRecord: boolean;
  retired: boolean;
}
