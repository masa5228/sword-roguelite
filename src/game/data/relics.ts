import type { Relic, RelicId } from "../../types";

export const RELIC_LIMIT = 6;

export const RELIC_RARITY_LABELS: Record<Relic["rarity"], string> = {
  common: "ノーマル",
  rare: "レア",
  boss: "ボス限定",
};

export const RELICS: Record<RelicId, Relic> = {
  chargedCore: { id: "chargedCore", name: "蓄力核", rarity: "common", description: "溜め攻撃の最大倍率が18%上昇する。" },
  emberSigil: { id: "emberSigil", name: "熾火の印", rarity: "rare", description: "燃焼・毒の継続ダメージが25%上昇する。" },
  ironBark: { id: "ironBark", name: "鉄樹の皮", rarity: "common", description: "受けるダメージを10%軽減する。" },
  luckyCoin: { id: "luckyCoin", name: "幸運のコイン", rarity: "rare", description: "会心率が5%上昇する。" },
  swiftSheath: { id: "swiftSheath", name: "疾風の鞘", rarity: "common", description: "攻撃速度が8%上昇する。" },
  bloodVial: { id: "bloodVial", name: "血瓶", rarity: "boss", description: "敵撃破時、最大HPの5%を回復する。" },
  spareSheath: { id: "spareSheath", name: "予備の鞘", rarity: "rare", description: "各階層開始時、回避ストックを1回追加する。キャラ上限は超えない。" },
  arcaneAmplifier: { id: "arcaneAmplifier", name: "魔導増幅核", rarity: "rare", description: "杖の燃焼・毒ダメージが25%上昇する。" },
  chargeGlove: { id: "chargeGlove", name: "蓄力用手袋", rarity: "rare", description: "溜め時間が10%増える代わりに、最大溜め倍率が25%上昇する。" },
  bloodiedOil: { id: "bloodiedOil", name: "血塗れの刃油", rarity: "rare", description: "非会心攻撃を当てるたび、次の通常攻撃の会心率が8%上昇。会心でリセット。" },
  heavyCloak: { id: "heavyCloak", name: "重装外套", rarity: "common", description: "被ダメージを20%軽減する代わりに、攻撃速度が5%低下する。" },
  comboTalisman: { id: "comboTalisman", name: "連撃の護符", rarity: "rare", description: "同じ敵への3回目の連続攻撃が35%強くなる。" },
  revivalStone: { id: "revivalStone", name: "蘇生石", rarity: "boss", description: "1回だけ、死亡時に最大HPの20%で復活する。" },
  bossEmblem: { id: "bossEmblem", name: "ボスの紋章", rarity: "boss", description: "ボス戦のみ、攻撃力が15%、溜め倍率が20%上昇する。" },
};

export function hasRelic(relics: RelicId[], id: RelicId): boolean {
  return relics.includes(id);
}

export function relicChoices(count = 3, boss = false, owned: RelicId[] = []): Relic[] {
  const pool = Object.values(RELICS).filter((relic) =>
    !owned.includes(relic.id) && (boss ? relic.rarity !== "common" : relic.rarity !== "boss")
  );
  const choices: Relic[] = [];
  while (choices.length < Math.min(count, pool.length)) {
    const relic = pool[Math.floor(Math.random() * pool.length)];
    if (!choices.some((choice) => choice.id === relic.id)) choices.push(relic);
  }
  return choices;
}
