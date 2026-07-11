import type { Character, CharacterType } from "../../types";

export const CHARACTERS: Record<CharacterType, Character> = {
  renon: {
    type: "renon",
    name: "れのん",
    attackMultiplier: 1,
    attackSpeedMultiplier: 1,
    chargeTimeMultiplier: 1,
    chargeMultiplier: 1,
    hpMultiplier: 1,
    criticalRateMultiplier: 1,
    criticalMultiplierMultiplier: 1,
  },
  hinata: {
    type: "hinata",
    name: "ひなた",
    attackMultiplier: 0.88,
    attackSpeedMultiplier: 1.28,
    chargeTimeMultiplier: 0.78,
    chargeMultiplier: 0.9,
    hpMultiplier: 0.85,
    criticalRateMultiplier: 1.08,
    criticalMultiplierMultiplier: 0.95,
  },
  kanata: {
    type: "kanata",
    name: "かなた",
    attackMultiplier: 1.18,
    attackSpeedMultiplier: 0.72,
    chargeTimeMultiplier: 1.2,
    chargeMultiplier: 1.12,
    hpMultiplier: 1.35,
    criticalRateMultiplier: 0.85,
    criticalMultiplierMultiplier: 1,
  },
  rin: {
    type: "rin",
    name: "りん",
    attackMultiplier: 0.82,
    attackSpeedMultiplier: 1,
    chargeTimeMultiplier: 0.62,
    chargeMultiplier: 1.45,
    hpMultiplier: 0.82,
    criticalRateMultiplier: 1,
    criticalMultiplierMultiplier: 1,
  },
};

export const DEFAULT_CHARACTER = CHARACTERS.renon;
