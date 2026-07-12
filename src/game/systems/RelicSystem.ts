import type { RelicId, Sword } from "../../types";

export function applyRelicsToSword(sword: Sword, relics: RelicId[]): Sword {
  return applyRelicsToSwordForContext(sword, relics, false);
}

export function applyRelicsToSwordForContext(sword: Sword, relics: RelicId[], isBoss: boolean): Sword {
  const chargeGlove = relics.includes("chargeGlove");
  const bossEmblem = isBoss && relics.includes("bossEmblem");
  return {
    ...sword,
    attack: sword.attack * (bossEmblem ? 1.15 : 1),
    attackSpeed: sword.attackSpeed * (relics.includes("swiftSheath") ? 1.08 : 1) * (relics.includes("heavyCloak") ? 0.95 : 1),
    criticalRate: Math.min(0.8, sword.criticalRate + (relics.includes("luckyCoin") ? 0.05 : 0)),
    chargeMultiplier: sword.chargeMultiplier * (relics.includes("chargedCore") ? 1.18 : 1) * (chargeGlove ? 1.25 : 1) * (bossEmblem ? 1.2 : 1),
    chargeTimeMultiplier: (sword.chargeTimeMultiplier ?? 1) * (chargeGlove ? 1.1 : 1),
  };
}

export function relicStatusDamageMultiplier(relics: RelicId[]): number {
  return relics.includes("emberSigil") ? 1.25 : 1;
}

export function relicStaffStatusDamageMultiplier(relics: RelicId[], swordType: Sword["type"]): number {
  return swordType === "arcaneStaff" && relics.includes("arcaneAmplifier") ? 1.25 : 1;
}

export function relicDamageTakenMultiplier(relics: RelicId[]): number {
  return (relics.includes("ironBark") ? 0.9 : 1) * (relics.includes("heavyCloak") ? 0.8 : 1);
}

export function relicComboAttackMultiplier(relics: RelicId[], attackNumber: number): number {
  return relics.includes("comboTalisman") && attackNumber % 3 === 0 ? 1.35 : 1;
}

export function relicBloodiedOilCritBonus(relics: RelicId[], stacks: number): number {
  return relics.includes("bloodiedOil") ? Math.min(0.4, stacks * 0.08) : 0;
}
