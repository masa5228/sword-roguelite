// §13 ボスシステム（MVPボス: 大剣の騎士）

export interface BossAttackPattern {
  id: string;
  nameJa: string;
  telegraphTime: number; // 秒
  damageMultiplier: number;
  hits: number;
  hitInterval: number; // 連続攻撃の間隔（秒）
  minHpRatio: number; // このHP割合以下で解放 (1=常時)
}

export interface BossBase {
  type: "bossKnight";
  nameJa: string;
  icon: string;
  baseHp: number;
  baseAttack: number;
  attackInterval: number;
  staggerResistance: number;
  coinMultiplier: number;
  patterns: BossAttackPattern[];
  description: string;
}

export const BOSS_KNIGHT: BossBase = {
  type: "bossKnight",
  nameJa: "大剣の騎士",
  icon: "🛡️",
  baseHp: 280,
  baseAttack: 13,
  attackInterval: 3.4,
  staggerResistance: 40,
  coinMultiplier: 10.0, // §10.3
  patterns: [
    { id: "sweep", nameJa: "横薙ぎ", telegraphTime: 0.9, damageMultiplier: 1.0, hits: 1, hitInterval: 0, minHpRatio: 1 },
    { id: "smash", nameJa: "振り下ろし", telegraphTime: 1.3, damageMultiplier: 1.6, hits: 1, hitInterval: 0, minHpRatio: 1 },
    { id: "rush", nameJa: "溜め突進", telegraphTime: 1.8, damageMultiplier: 2.2, hits: 1, hitInterval: 0, minHpRatio: 1 },
    // HP50%以下で連続攻撃を追加 (§13.2)
    { id: "combo", nameJa: "連続攻撃", telegraphTime: 1.0, damageMultiplier: 0.7, hits: 3, hitInterval: 0.45, minHpRatio: 0.5 },
  ],
  description: "10階層ごとに立ちはだかる重騎士。多彩な剣技を使う。",
};

// §13.3 ボス撃破報酬
export const BOSS_HEAL_RATIO = 0.3;
export const BOSS_REWARD_SWORD_COUNT = 3;
