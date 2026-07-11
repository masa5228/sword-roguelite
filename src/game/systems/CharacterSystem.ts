import type { Character, Sword } from "../../types";

/** 武器データを変更せず、キャラクター補正済みの戦闘値を作る。 */
export function applyCharacterToSword(sword: Sword, character: Character): Sword {
  return {
    ...sword,
    attack: sword.attack * character.attackMultiplier,
    attackSpeed: sword.attackSpeed * character.attackSpeedMultiplier,
    chargeMultiplier: sword.chargeMultiplier * character.chargeMultiplier,
    criticalRate: Math.min(0.8, sword.criticalRate * character.criticalRateMultiplier),
    criticalMultiplier: sword.criticalMultiplier * character.criticalMultiplierMultiplier,
  };
}

export function characterChargeStartMs(baseMs: number, character: Character): number {
  return baseMs * character.chargeTimeMultiplier;
}

export function characterChargeMaxMs(baseMs: number, character: Character): number {
  return baseMs * character.chargeTimeMultiplier;
}
