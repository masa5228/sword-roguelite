import type { Sword } from "../../types";

// §8.4 ダメージ計算
export interface AttackResult {
  damage: number;
  isCritical: boolean;
}

/** 通常/溜め攻撃のダメージ。attackMultiplier: 通常=1.0、溜め=溜め時間に応じた倍率 */
export function rollAttackDamage(sword: Sword, attackMultiplier: number, rand: () => number = Math.random): AttackResult {
  const base = sword.attack * attackMultiplier;
  const isCritical = rand() < sword.criticalRate;
  const damage = Math.max(1, Math.round(isCritical ? base * sword.criticalMultiplier : base));
  return { damage, isCritical };
}

/** 最終被ダメージ = 敵攻撃力 × 100 ÷ (100 + プレイヤー防御力) */
export function playerDamageTaken(enemyAttack: number, defense: number): number {
  return Math.max(1, Math.round((enemyAttack * 100) / (100 + defense)));
}

/** §8.6 溜め攻撃: 溜め時間(ms)に応じた倍率。300msで開始、1500msで最大 */
export const CHARGE_START_MS = 300;
export const CHARGE_MAX_MS = 1500;

export function chargeMultiplier(sword: Sword, heldMs: number, startMs = CHARGE_START_MS, maxMs = CHARGE_MAX_MS): number {
  if (heldMs < startMs) return 1.0;
  const t = Math.min(1, (heldMs - startMs) / (maxMs - startMs));
  return 1.0 + (sword.chargeMultiplier - 1.0) * t;
}

/** ひるみ判定: ノックバック vs ひるみ耐性。charged=溜め攻撃はひるませやすい (§12.3 オーク) */
export function rollStagger(knockback: number, resistance: number, charged: boolean, rand: () => number = Math.random): boolean {
  const power = knockback * (charged ? 2.5 : 1.0);
  const chance = Math.min(0.85, power / (power + resistance * 2));
  return rand() < chance;
}

/** 推定DPS (§9.5 剣比較の表示項目) */
export function estimateDps(sword: Sword): number {
  const critBonus = 1 + sword.criticalRate * (sword.criticalMultiplier - 1);
  const effectBonus = sword.effects.reduce((s, e) => {
    if (e.type === "burn" || e.type === "poison") return s + 0.08 * e.level;
    return s;
  }, 1);
  return Math.round(sword.attack * sword.attackSpeed * critBonus * effectBonus * 10) / 10;
}

/** 特殊効果の実数値 */
export function dotDamagePerTick(sword: Sword, type: "burn" | "poison"): number {
  const eff = sword.effects.find((e) => e.type === type);
  if (!eff) return 0;
  return Math.max(1, Math.round(sword.attack * 0.12 * eff.level));
}

export function lifestealRatio(sword: Sword): number {
  const eff = sword.effects.find((e) => e.type === "lifesteal");
  return eff ? 0.06 * eff.level : 0;
}
