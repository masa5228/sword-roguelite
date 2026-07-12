import type { RelicId, Sword } from "../../types";

export function applyRelicsToSword(sword: Sword, relics: RelicId[]): Sword {
  return applyRelicsToSwordForContext(sword, relics, false);
}

export function applyRelicsToSwordForContext(sword: Sword, relics: RelicId[], isBoss: boolean, playerHpRatio = 1): Sword {
  const chargeGlove = relics.includes("chargeGlove");
  const bossEmblem = isBoss && relics.includes("bossEmblem");
  const lowHpBerserker = relics.includes("berserkerCrest") && playerHpRatio <= 0.4;
  return {
    ...sword,
    attack: sword.attack * (relics.includes("warBanner") ? 1.15 : 1) * (bossEmblem ? 1.15 : 1) * (lowHpBerserker ? 1.4 : 1) * (relics.includes("titanGrip") ? 1.25 : 1),
    attackSpeed: sword.attackSpeed * (relics.includes("swiftSheath") ? 1.08 : 1) * (relics.includes("heavyCloak") ? 0.95 : 1) * (relics.includes("overclockGear") ? 1.2 : 1) * (relics.includes("titanGrip") ? 0.85 : 1),
    criticalRate: Math.min(0.8, sword.criticalRate + (relics.includes("luckyCoin") ? 0.05 : 0) + (relics.includes("precisionLens") ? 0.12 : 0)),
    chargeMultiplier: sword.chargeMultiplier * (relics.includes("chargedCore") ? 1.18 : 1) * (chargeGlove ? 1.25 : 1) * (bossEmblem ? 1.2 : 1) * (relics.includes("grandChargeCore") ? 1.45 : 1),
    chargeTimeMultiplier: (sword.chargeTimeMultiplier ?? 1) * (chargeGlove ? 1.1 : 1) * (relics.includes("grandChargeCore") ? 1.2 : 1),
  };
}

export function relicStatusDamageMultiplier(relics: RelicId[]): number {
  return relics.includes("emberSigil") ? 1.25 : 1;
}

export function relicStaffStatusDamageMultiplier(relics: RelicId[], swordType: Sword["type"]): number {
  return swordType === "arcaneStaff" && relics.includes("arcaneAmplifier") ? 1.25 : 1;
}

export function relicDamageTakenMultiplier(relics: RelicId[]): number {
  return (relics.includes("ironBark") ? 0.9 : 1) * (relics.includes("heavyCloak") ? 0.8 : 1) * (relics.includes("aegisPlate") ? 0.7 : 1);
}

export function relicComboAttackMultiplier(relics: RelicId[], attackNumber: number): number {
  return relics.includes("comboTalisman") && attackNumber % 3 === 0 ? 1.35 : 1;
}

export function relicBloodiedOilCritBonus(relics: RelicId[], stacks: number): number {
  return relics.includes("bloodiedOil") ? Math.min(0.4, stacks * 0.08) : 0;
}
