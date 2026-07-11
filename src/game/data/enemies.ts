import type { EnemyKind, EliteEffect } from "../../types";

// §12.3 敵の種類（MVP5種）+ §12.1 基本ステータス
// attackStyle: melee=接近攻撃 / multi=連続攻撃 / guard=ガード持ち / heavy=大振り / ranged=遠距離
export type AttackStyle = "melee" | "multi" | "guard" | "heavy" | "ranged";

export interface EnemyBase {
  type: EnemyKind;
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
