import type { EnemyKind, EliteEffect } from "../../types";

// §12.3 敵の種類（MVP5種）+ §12.1 基本ステータス
// attackStyle: melee=接近攻撃 / multi=連続攻撃 / guard=ガード持ち / heavy=大振り / ranged=遠距離
export type AttackStyle = "melee" | "multi" | "guard" | "heavy" | "ranged";

export interface EnemyBase {
  type: EnemyKind;
  spriteType: Exclude<EnemyKind, "bossKnight">;
  nameJa: string;
  icon: string;
  baseHp: number;
  baseAttack: number;
  attackInterval: number; // 秒
  telegraphTime: number; // 攻撃予告時間（秒）§8.8
  staggerResistance: number;
  coinMultiplier: number; // §10.3 敵種補正
  dropMultiplier: number; // §9.3 通常2% 強敵8% → 倍率 1 / 4
  attackStyle: AttackStyle;
  minFloor: number;
  description: string;
}

export const ENEMY_BASES: Record<Exclude<EnemyKind, "bossKnight">, EnemyBase> = {
  slime: {
    type: "slime",
    spriteType: "slime",
    nameJa: "スライム",
    icon: "🟢",
    baseHp: 38,
    baseAttack: 7,
    attackInterval: 3.2,
    telegraphTime: 1.0,
    staggerResistance: 10,
    coinMultiplier: 1.0,
    dropMultiplier: 1,
    attackStyle: "melee",
    minFloor: 1,
    description: "HPが高く攻撃が遅い。序盤の敵。",
  },
  goblin: {
    type: "goblin",
    spriteType: "goblin",
    nameJa: "ゴブリン",
    icon: "👺",
    baseHp: 24,
    baseAttack: 6,
    attackInterval: 2.4,
    telegraphTime: 0.7,
    staggerResistance: 5,
    coinMultiplier: 1.0,
    dropMultiplier: 1,
    attackStyle: "multi",
    minFloor: 1,
    description: "素早く連続攻撃を仕掛けてくる。HPは低い。",
  },
  skeleton: {
    type: "skeleton",
    spriteType: "skeleton",
    nameJa: "スケルトン",
    icon: "💀",
    baseHp: 30,
    baseAttack: 10,
    attackInterval: 2.8,
    telegraphTime: 0.9,
    staggerResistance: 18,
    coinMultiplier: 1.2,
    dropMultiplier: 1,
    attackStyle: "guard",
    minFloor: 4,
    description: "一定回数攻撃をガードする。ガードが崩れると隙だらけに。",
  },
  orc: {
    type: "orc",
    spriteType: "orc",
    nameJa: "オーク",
    icon: "👹",
    baseHp: 50,
    baseAttack: 15,
    attackInterval: 3.6,
    telegraphTime: 1.4,
    staggerResistance: 8,
    coinMultiplier: 1.5, // 強敵
    dropMultiplier: 4,
    attackStyle: "heavy",
    minFloor: 6,
    description: "攻撃力が高いが予告が長い。溜め攻撃でひるませやすい。",
  },
  mage: {
    type: "mage",
    spriteType: "mage",
    nameJa: "魔術師",
    icon: "🧙",
    baseHp: 22,
    baseAttack: 12,
    attackInterval: 3.0,
    telegraphTime: 1.1,
    staggerResistance: 12,
    coinMultiplier: 1.5, // 強敵
    dropMultiplier: 4,
    attackStyle: "ranged",
    minFloor: 8,
    description: "遠距離攻撃を使う。攻撃範囲を事前に表示する。",
  },
  bat: {
    type: "bat",
    spriteType: "bat",
    nameJa: "コウモリ",
    icon: "🦇",
    baseHp: 18,
    baseAttack: 8,
    attackInterval: 1.9,
    telegraphTime: 0.55,
    staggerResistance: 4,
    coinMultiplier: 0.9,
    dropMultiplier: 1,
    attackStyle: "multi",
    minFloor: 3,
    description: "素早い連撃でプレイヤーを追い詰める飛行敵。",
  },
  beetle: {
    type: "beetle",
    spriteType: "beetle",
    nameJa: "甲虫兵",
    icon: "🪲",
    baseHp: 65,
    baseAttack: 9,
    attackInterval: 3.3,
    telegraphTime: 1.1,
    staggerResistance: 25,
    coinMultiplier: 1.4,
    dropMultiplier: 1,
    attackStyle: "guard",
    minFloor: 5,
    description: "硬い外殻で攻撃を防ぐ防御型の敵。",
  },
  wolf: {
    type: "wolf",
    spriteType: "wolf",
    nameJa: "狼牙獣",
    icon: "🐺",
    baseHp: 36,
    baseAttack: 12,
    attackInterval: 2.2,
    telegraphTime: 0.6,
    staggerResistance: 10,
    coinMultiplier: 1.3,
    dropMultiplier: 1,
    attackStyle: "multi",
    minFloor: 7,
    description: "短い予告から連続で飛びかかる高速型の敵。",
  },
  shaman: {
    type: "shaman",
    spriteType: "shaman",
    nameJa: "呪術師",
    icon: "🔮",
    baseHp: 34,
    baseAttack: 14,
    attackInterval: 3.4,
    telegraphTime: 1.2,
    staggerResistance: 15,
    coinMultiplier: 1.8,
    dropMultiplier: 4,
    attackStyle: "ranged",
    minFloor: 10,
    description: "遠距離攻撃で安全圏から狙う術師。",
  },
  wraith: {
    type: "wraith",
    spriteType: "wraith",
    nameJa: "亡霊",
    icon: "👻",
    baseHp: 28,
    baseAttack: 18,
    attackInterval: 2.8,
    telegraphTime: 0.9,
    staggerResistance: 6,
    coinMultiplier: 2.0,
    dropMultiplier: 4,
    attackStyle: "ranged",
    minFloor: 14,
    description: "高威力の呪弾を短い間隔で放つ危険な敵。",
  },
  golem: {
    type: "golem",
    spriteType: "golem",
    nameJa: "岩石巨人",
    icon: "🗿",
    baseHp: 82,
    baseAttack: 18,
    attackInterval: 4.2,
    telegraphTime: 1.8,
    staggerResistance: 30,
    coinMultiplier: 2.2,
    dropMultiplier: 4,
    attackStyle: "heavy",
    minFloor: 18,
    description: "非常に頑丈で、予告の長い重い一撃を放つ敵。",
  },
};

export const ELITE_INFO: Record<EliteEffect, { nameJa: string; icon: string; description: string }> = {
  giant: { nameJa: "巨大化", icon: "🔺", description: "巨大化しHPが大幅に増加" },
  frenzy: { nameJa: "狂乱", icon: "💢", description: "攻撃速度が大幅に上昇" },
  regen: { nameJa: "再生", icon: "💚", description: "HPが徐々に回復する" },
};

// §12.2 敵の強化式
export const HP_GROWTH = 1.12;
export const ATK_GROWTH = 1.08;

// §10.3 コイン計算
export const BASE_COIN = 10;
export const FLOOR_COIN_RATE = 0.05;

// §9.3 剣ドロップ率
export const BASE_DROP_RATE = 0.02;
export const ELITE_DROP_RATE = 0.2;
