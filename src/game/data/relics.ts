import type { Relic, RelicId } from "../../types";

export const RELIC_LIMIT = 6;

export const RELICS: Record<RelicId, Relic> = {
  chargedCore: { id: "chargedCore", name: "蓄力核", rarity: "common", description: "溜め攻撃の最大倍率が18%上昇する。" },
  emberSigil: { id: "emberSigil", name: "熾火の印", rarity: "rare", description: "燃焼・毒の継続ダメージが25%上昇する。" },
  ironBark: { id: "ironBark", name: "鉄樹の皮", rarity: "common", description: "受けるダメージを10%軽減する。" },
  luckyCoin: { id: "luckyCoin", name: "幸運貨", rarity: "rare", description: "会心率が5%上昇する。" },
  swiftSheath: { id: "swiftSheath", name: "疾風の鞘", rarity: "common", description: "攻撃速度が8%上昇する。" },
  bloodVial: { id: "bloodVial", name: "血瓶", rarity: "boss", description: "敵撃破時、最大HPの5%を回復する。" },
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
