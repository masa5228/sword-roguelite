import type { GameFlow } from "../../game/GameFlow";
import type { ResultData } from "../../types";
import { RARITY_INFO } from "../../game/data/swords";
import { button, el, screenEl } from "../components";
import { renderSwordSelect } from "./swordSelect";

// SC-008 リザルト画面 (§14.3 表示項目)
export function renderResult(flow: GameFlow, result: ResultData, show: (el: HTMLElement) => void): HTMLElement {
  const s = screenEl();

  s.appendChild(el("h2", undefined, result.retired ? "🏳 リタイア" : "💀 力尽きた…"));
  if (result.newRecord && result.floor > 1) {
    const rec = el("div", "subtitle", "🎉 自己ベスト更新！");
    rec.style.color = "#ffd76a";
    s.appendChild(rec);
  }

  const mins = Math.floor(result.playTimeMs / 60000);
  const secs = Math.floor((result.playTimeMs % 60000) / 1000);

  const table = el("table", "result-table");
  const rows: [string, string][] = [
    ["到達階層", `${result.floor}F`],
    ["撃破した敵", `${result.kills}体`],
    ["撃破したボス", `${result.bossKills}体`],
    ["獲得コイン総額", `💰${result.totalCoins}`],
    ["最大ダメージ", `${result.maxDamage}`],
    ["使用した剣", result.swordName],
    ["最高レアリティ", result.bestRarity ? `${RARITY_INFO[result.bestRarity].icon} ${RARITY_INFO[result.bestRarity].nameJa}` : "─"],
    ["プレイ時間", `${mins}分${secs}秒`],
  ];
  for (const [label, value] of rows) {
    const tr = el("tr");
    tr.appendChild(el("td", undefined, label));
    tr.appendChild(el("td", undefined, value));
    table.appendChild(tr);
  }
  s.appendChild(table);

  s.appendChild(el("div", "spacer"));
  s.appendChild(el("div", "footnote", "コイン・剣・強化状態は失われた。図鑑と記録は残る。"));
  s.appendChild(button("⚔ もう一度挑戦", "menu-btn primary", () => show(renderSwordSelect(flow))));
  s.appendChild(button("タイトルへ", "menu-btn", () => flow.backToTitle()));
  return s;
}
