import type { EliteEffect, Enemy, EnemyKind } from "../../types";
import { ATK_GROWTH, BASE_COIN, ELITE_INFO, ENEMY_BASES, FLOOR_COIN_RATE, HP_GROWTH } from "../data/enemies";
import { BOSS_KNIGHT } from "../data/bosses";
import { pickWeighted } from "./rng";

// §6.1 階層構成 / §12.2 敵の強化式 / §10.3 コイン計算

export function isBossFloor(floor: number): boolean {
  return floor % 10 === 0;
}

export function isEliteFloor(floor: number): boolean {
  return floor % 5 === 0 && !isBossFloor(floor);
}

let enemySeq = 0;

export function createEnemyForFloor(floor: number, rand: () => number = Math.random): Enemy {
  if (isBossFloor(floor)) return createBoss(floor);

  // 出現可能な敵から重み付き抽選（新しく解放された敵を出やすく）
  const candidates = Object.values(ENEMY_BASES).filter((b) => b.minFloor <= floor);
  const base = pickWeighted(
    rand,
    candidates.map((b) => [b, b.minFloor + 4 >= floor ? 3 : 1] as [typeof b, number])
  );

  const hpScale = Math.pow(HP_GROWTH, floor);
  const atkScale = Math.pow(ATK_GROWTH, floor);

  const elite = isEliteFloor(floor);
  const eliteEffects: EliteEffect[] = [];
  let hpMult = 1;
  let intervalMult = 1;
  if (elite) {
    const effect = pickWeighted<EliteEffect>(rand, [
      ["giant", 1],
      ["frenzy", 1],
      ["regen", 1],
    ]);
    eliteEffects.push(effect);
    if (effect === "giant") hpMult = 2.2;
    if (effect === "frenzy") intervalMult = 0.6;
    if (effect === "regen") hpMult = 1.4;
  }

  const maxHp = Math.round(base.baseHp * hpScale * hpMult);
  const name = elite ? `${ELITE_INFO[eliteEffects[0]].nameJa}・${base.nameJa}` : base.nameJa;

  return {
    id: `enemy-${floor}-${enemySeq++}`,
    name,
    type: base.type,
    spriteType: base.spriteType,
    role: elite ? "elite" : base.coinMultiplier > 1.2 ? "strong" : "normal",
    floor,
    maxHp,
    currentHp: maxHp,
    attack: Math.round(base.baseAttack * atkScale),
    attackInterval: Math.round(base.attackInterval * intervalMult * 100) / 100,
    staggerResistance: base.staggerResistance * (elite ? 2 : 1),
    coinMultiplier: elite ? 3.0 : base.coinMultiplier,
    dropMultiplier: base.dropMultiplier,
    eliteEffects,
  };
}

export function createBoss(floor: number): Enemy {
  const hpScale = Math.pow(HP_GROWTH, floor);
  const atkScale = Math.pow(ATK_GROWTH, floor);
  const maxHp = Math.round(BOSS_KNIGHT.baseHp * hpScale);
  return {
    id: `boss-${floor}-${enemySeq++}`,
    name: BOSS_KNIGHT.nameJa,
    type: "bossKnight",
    spriteType: "bossKnight",
    role: "boss",
    floor,
    maxHp,
    currentHp: maxHp,
    attack: Math.round(BOSS_KNIGHT.baseAttack * atkScale),
    attackInterval: BOSS_KNIGHT.attackInterval,
    staggerResistance: BOSS_KNIGHT.staggerResistance,
    coinMultiplier: BOSS_KNIGHT.coinMultiplier,
    dropMultiplier: 50,
    eliteEffects: [],
  };
}

/** 獲得コイン = 基礎コイン × 階層補正 × 敵種補正 (§10.3) */
export function coinsForKill(enemy: Enemy): number {
  const floorBonus = 1 + enemy.floor * FLOOR_COIN_RATE;
  return Math.round(BASE_COIN * floorBonus * enemy.coinMultiplier);
}

export function enemyIcon(type: EnemyKind): string {
  if (type === "bossKnight") return BOSS_KNIGHT.icon;
  return ENEMY_BASES[type].icon;
}

export function enemyDexKey(enemy: Enemy): string {
  return enemy.role === "elite" ? `${enemy.type}:elite-${enemy.eliteEffects[0]}` : enemy.type;
}
