import type { RelicId, Sword } from "../../types";

export function applyRelicsToSword(sword: Sword, relics: RelicId[]): Sword {
  return {
    ...sword,
    attackSpeed: sword.attackSpeed * (relics.includes("swiftSheath") ? 1.08 : 1),
    criticalRate: Math.min(0.8, sword.criticalRate + (relics.includes("luckyCoin") ? 0.05 : 0)),
    chargeMultiplier: sword.chargeMultiplier * (relics.includes("chargedCore") ? 1.18 : 1),
  };
}

export function relicStatusDamageMultiplier(relics: RelicId[]): number {
  return relics.includes("emberSigil") ? 1.25 : 1;
}

export function relicDamageTakenMultiplier(relics: RelicId[]): number {
  return relics.includes("ironBark") ? 0.9 : 1;
}
