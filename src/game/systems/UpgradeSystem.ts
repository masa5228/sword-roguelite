import type { Sword } from "../../types";
import { RARITY_INFO } from "../data/swords";
import { calcSellPrice } from "./DropSystem";

// §11 剣強化システム

export type UpgradeKind = "attack" | "attackSpeed" | "criticalRate" | "criticalMultiplier" | "effect";

export const UPGRADE_LABELS: Record<UpgradeKind, string> = {
  attack: "攻撃力強化",
  attackSpeed: "攻撃速度強化",
  criticalRate: "会心率強化",
  criticalMultiplier: "会心倍率強化",
  effect: "特殊効果強化",
};

const UPGRADE_BASE_PRICE = 15;
const PRICE_GROWTH = 1.35; // §11.2

/** 必要コイン = 基本価格 × 1.35^強化回数（切り上げ） */
export function upgradeCost(sword: Sword): number {
  return Math.ceil(UPGRADE_BASE_PRICE * Math.pow(PRICE_GROWTH, sword.level));
}

/** §11.3 強化上限 */
export function maxLevel(sword: Sword): number {
  return RARITY_INFO[sword.rarity].maxLevel;
}

export function canUpgrade(sword: Sword, coins: number): boolean {
  return sword.level < maxLevel(sword) && coins >= upgradeCost(sword);
}

/** 強化を適用し、消費コインを返す。失敗時は0 */
export function applyUpgrade(sword: Sword, kind: UpgradeKind, coins: number): number {
  if (!canUpgrade(sword, coins)) return 0;
  if (kind === "effect" && sword.effects.length === 0) return 0;
  const cost = upgradeCost(sword);

  switch (kind) {
    case "attack":
      sword.attack = Math.round(sword.attack * 1.13) || sword.attack + 1;
      break;
    case "attackSpeed":
      sword.attackSpeed = Math.min(3.0, Math.round(sword.attackSpeed * 1.06 * 100) / 100);
      break;
    case "criticalRate":
      sword.criticalRate = Math.min(0.8, Math.round((sword.criticalRate + 0.02) * 1000) / 1000);
      break;
    case "criticalMultiplier":
      sword.criticalMultiplier = Math.round((sword.criticalMultiplier + 0.12) * 100) / 100;
      break;
    case "effect":
      for (const e of sword.effects) e.level += 1;
      break;
  }

  sword.level += 1;
  sword.spentCoins += cost;
  sword.sellPrice = calcSellPrice(sword);
  return cost;
}

/** HP回復の価格（階層に応じて上昇）と回復量 */
export function healCost(floor: number): number {
  return Math.ceil(25 * (1 + floor * 0.05));
}

export const HEAL_RATIO = 0.3;
