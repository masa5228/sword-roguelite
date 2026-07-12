import type { SwordRarity, SwordType, EffectType } from "../../types";

// §9.1 剣の種類（MVPは3種 §27.1）/ §26.2 初期剣
export interface SwordBase {
  type: SwordType;
  nameJa: string;
  icon: string;
  attack: number;
  attackSpeed: number;
  criticalRate: number;
  criticalMultiplier: number;
  chargeMultiplier: number;
  chargeTimeMultiplier?: number;
  knockback: number;
  guaranteedEffect?: EffectType;
  description: string;
}

export const SWORD_BASES: Record<SwordType, SwordBase> = {
  longSword: {
    type: "longSword",
    nameJa: "ロングソード",
    icon: "🗡️",
    attack: 10,
    attackSpeed: 1.0,
    criticalRate: 0.05,
    criticalMultiplier: 1.5,
    chargeMultiplier: 2.5,
    knockback: 10,
    description: "攻撃力・速度・会心のバランスが良い標準的な剣。",
  },
  greatSword: {
    type: "greatSword",
    nameJa: "グレートソード",
    icon: "⚔️",
    attack: 18,
    attackSpeed: 0.6,
    criticalRate: 0.05,
    criticalMultiplier: 1.5,
    chargeMultiplier: 3.2,
    knockback: 25,
    description: "高攻撃力・低速。溜め攻撃とノックバックが強力。",
  },
  rapier: {
    type: "rapier",
    nameJa: "レイピア",
    icon: "🤺",
    attack: 6,
    attackSpeed: 1.6,
    criticalRate: 0.18,
    criticalMultiplier: 1.8,
    chargeMultiplier: 2.0,
    knockback: 5,
    description: "高速・高会心。一撃の威力は低い。",
  },
  katana: { type: "katana", nameJa: "カタナ", icon: "⚔", attack: 12, attackSpeed: 1.05, criticalRate: 0.12, criticalMultiplier: 2.0, chargeMultiplier: 2.7, knockback: 8, description: "高い会心倍率で一撃を狙う刀。" },
  twinBlade: { type: "twinBlade", nameJa: "双刃", icon: "⚔", attack: 5, attackSpeed: 2.15, criticalRate: 0.1, criticalMultiplier: 1.55, chargeMultiplier: 1.7, knockback: 3, description: "攻撃速度に特化した二刀流。" },
  battleAxe: { type: "battleAxe", nameJa: "戦斧", icon: "🪓", attack: 23, attackSpeed: 0.48, criticalRate: 0.08, criticalMultiplier: 1.8, chargeMultiplier: 3.6, knockback: 30, description: "重い一撃と高いノックバックを持つ斧。" },
  warHammer: { type: "warHammer", nameJa: "戦槌", icon: "🔨", attack: 28, attackSpeed: 0.35, criticalRate: 0.03, criticalMultiplier: 1.6, chargeMultiplier: 4.2, knockback: 45, description: "溜め攻撃の破壊力が最大のハンマー。" },
  spear: { type: "spear", nameJa: "長槍", icon: "🔱", attack: 11, attackSpeed: 1.1, criticalRate: 0.06, criticalMultiplier: 1.6, chargeMultiplier: 2.4, knockback: 22, description: "間合いとノックバックに優れた槍。" },
  whipBlade: { type: "whipBlade", nameJa: "蛇腹剣", icon: "〰", attack: 8, attackSpeed: 1.35, criticalRate: 0.09, criticalMultiplier: 1.7, chargeMultiplier: 2.2, knockback: 18, description: "素早さと押し返しを両立する変則剣。" },
  crystalSword: { type: "crystalSword", nameJa: "晶剣", icon: "💎", attack: 14, attackSpeed: 0.85, criticalRate: 0.15, criticalMultiplier: 1.9, chargeMultiplier: 3.0, knockback: 12, description: "会心と溜め攻撃に秀でた結晶の剣。" },
  cursedBlade: { type: "cursedBlade", nameJa: "呪剣", icon: "🩸", attack: 17, attackSpeed: 0.9, criticalRate: 0.2, criticalMultiplier: 2.1, chargeMultiplier: 2.8, knockback: 6, description: "会心に特化した危険な呪いの剣。" },
  sunBlade: { type: "sunBlade", nameJa: "陽刃", icon: "☀", attack: 16, attackSpeed: 1.0, criticalRate: 0.1, criticalMultiplier: 1.85, chargeMultiplier: 3.4, knockback: 16, description: "通常攻撃と溜め攻撃が安定した光の剣。" },
  arcaneStaff: { type: "arcaneStaff", nameJa: "魔導杖", icon: "🔮", attack: 4, attackSpeed: 0.65, criticalRate: 0.08, criticalMultiplier: 1.7, chargeMultiplier: 10.5, chargeTimeMultiplier: 1.4, knockback: 8, guaranteedEffect: "burn", description: "通常攻撃は弱いが、燃焼を伴う高倍率の溜め攻撃に特化した杖。" },
};

// §9.2 レアリティ
export const RARITY_INFO: Record<
  SwordRarity,
  { nameJa: string; icon: string; statMult: number; effectCount: number; maxLevel: number; basePrice: number; weight: number }
> = {
  // maxLevel: §11.3 強化上限 / basePrice: 売却・強化の基準価格
  common: { nameJa: "コモン", icon: "◇", statMult: 1.0, effectCount: 0, maxLevel: 10, basePrice: 20, weight: 70 },
  rare: { nameJa: "レア", icon: "◆", statMult: 1.18, effectCount: 1, maxLevel: 15, basePrice: 60, weight: 25 },
  epic: { nameJa: "エピック", icon: "★", statMult: 1.38, effectCount: 2, maxLevel: 20, basePrice: 150, weight: 5 },
};

export const EFFECT_INFO: Record<EffectType, { nameJa: string; icon: string; description: string }> = {
  burn: { nameJa: "炎上", icon: "🔥", description: "攻撃時、敵を炎上させ継続ダメージ" },
  poison: { nameJa: "毒", icon: "☠️", description: "攻撃時、敵に毒の継続ダメージ" },
  lifesteal: { nameJa: "吸血", icon: "🩸", description: "与ダメージの一部をHPとして吸収" },
};

// §9.4 剣名生成用
export const NAME_PREFIXES: Record<SwordRarity, string[]> = {
  common: ["よくある", "使い古した", "無銘の", "駆け出しの", "鈍色の"],
  rare: ["研ぎ澄まされた", "騎士の", "月光の", "疾風の", "白銀の"],
  epic: ["竜殺しの", "星降る", "王家の", "深淵の", "覇者の"],
};

export const EFFECT_PREFIXES: Record<EffectType, string> = {
  burn: "灼熱の",
  poison: "毒蛇の",
  lifesteal: "血啜りの",
};
