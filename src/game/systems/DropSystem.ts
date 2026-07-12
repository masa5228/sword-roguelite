import type { Enemy, EffectType, Sword, SwordRarity, SwordType } from "../../types";
import { EFFECT_PREFIXES, NAME_PREFIXES, RARITY_INFO, SWORD_BASES } from "../data/swords";
import { BASE_DROP_RATE, ELITE_DROP_RATE } from "../data/enemies";
import { pickWeighted } from "./rng";

// §9.3 剣ドロップ率 / §9.4 剣生成

let swordSeq = 0;
const DROP_RATE_MULTIPLIER = 2;

export function rollDrop(enemy: Enemy, rand: () => number = Math.random): boolean {
  if (enemy.role === "boss") return true; // 100%
  const baseRate = enemy.role === "elite" ? ELITE_DROP_RATE : BASE_DROP_RATE * enemy.dropMultiplier;
  const rate = Math.min(1, baseRate * DROP_RATE_MULTIPLIER);
  return rand() < rate;
}

/** §9.4 の生成手順: 1.レアリティ抽選 → 2.剣種抽選 → 3.基礎ステータス → 4.ランダム補正 → 5.特殊効果 → 6.剣名 */
export function generateSword(floor: number, rand: () => number = Math.random, forcedRarity?: SwordRarity): Sword {
  // 1. レアリティ抽選（階層が深いほど高レア寄り）
  const rarity =
    forcedRarity ??
    pickWeighted<SwordRarity>(rand, [
      ["common", RARITY_INFO.common.weight],
      ["rare", RARITY_INFO.rare.weight + floor * 0.6],
      ["epic", RARITY_INFO.epic.weight + floor * 0.35],
    ]);

  // 2. 剣種抽選
  const type = pickWeighted<SwordType>(rand, [
    ["longSword", 14], ["greatSword", 9], ["rapier", 9], ["katana", 9],
    ["twinBlade", 10], ["battleAxe", 7], ["warHammer", 5], ["spear", 9],
    ["whipBlade", 8], ["crystalSword", 7], ["cursedBlade", 6], ["sunBlade", 7], ["arcaneStaff", 5],
  ]);
  const base = SWORD_BASES[type];
  const rInfo = RARITY_INFO[rarity];

  // 3. 基礎ステータス（階層スケール: ドロップ剣が現階層で通用する強さになる）
  const floorScale = 1 + floor * 0.055;
  // 4. ランダム補正 ±10%
  const vary = () => 0.9 + rand() * 0.2;

  const attack = Math.max(1, Math.round(base.attack * rInfo.statMult * floorScale * vary()));
  const attackSpeed = Math.round(base.attackSpeed * (0.95 + rand() * 0.1) * 100) / 100;
  const criticalRate = Math.round(base.criticalRate * rInfo.statMult * vary() * 1000) / 1000;
  const criticalMultiplier = Math.round(base.criticalMultiplier * (1 + (rInfo.statMult - 1) * 0.5) * 100) / 100;

  // 5. 特殊効果抽選 (§9.2 Common:0 / Rare:1 / Epic:2)
  const pool: EffectType[] = ["burn", "poison", "lifesteal"];
  const effects: { type: EffectType; level: number }[] = [];
  if (base.guaranteedEffect) {
    effects.push({ type: base.guaranteedEffect, level: 1 });
    pool.splice(pool.indexOf(base.guaranteedEffect), 1);
  }
  for (let i = 0; i < rInfo.effectCount && pool.length > 0; i++) {
    const idx = Math.floor(rand() * pool.length);
    effects.push({ type: pool.splice(idx, 1)[0], level: 1 });
  }

  // 6. 剣名生成
  const prefixes = NAME_PREFIXES[rarity];
  let name = prefixes[Math.floor(rand() * prefixes.length)] + base.nameJa;
  if (effects.length > 0) {
    name = EFFECT_PREFIXES[effects[0].type] + base.nameJa;
  }

  const basePrice = Math.round(rInfo.basePrice * (1 + floor * 0.05));

  const sword: Sword = {
    id: `sword-${Date.now()}-${swordSeq++}`,
    name,
    type,
    rarity,
    level: 0,
    attack,
    attackSpeed,
    criticalRate: Math.min(0.8, criticalRate),
    criticalMultiplier,
    chargeMultiplier: base.chargeMultiplier,
    knockback: Math.round(base.knockback * rInfo.statMult),
    effects,
    basePrice,
    spentCoins: 0,
    sellPrice: 0,
  };
  sword.sellPrice = calcSellPrice(sword);
  return sword;
}

/** §11.4 売却価格 = 剣基本価格 + 累計強化費用 × 0.3 */
export function calcSellPrice(sword: Sword): number {
  return Math.round(sword.basePrice + sword.spentCoins * 0.3);
}

/** §2 初期剣（§26.2 の初期値そのまま） */
export function createStarterSword(type: SwordType): Sword {
  const base = SWORD_BASES[type];
  return {
    id: `starter-${type}`,
    name: base.nameJa,
    type,
    rarity: "common",
    level: 0,
    attack: type === "longSword" ? 10 : base.attack,
    attackSpeed: base.attackSpeed,
    criticalRate: base.criticalRate,
    criticalMultiplier: base.criticalMultiplier,
    chargeMultiplier: base.chargeMultiplier,
    knockback: base.knockback,
    effects: base.guaranteedEffect ? [{ type: base.guaranteedEffect, level: 1 }] : [],
    basePrice: RARITY_INFO.common.basePrice,
    spentCoins: 0,
    sellPrice: RARITY_INFO.common.basePrice,
  };
}
