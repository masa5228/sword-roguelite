import type { GameFlow } from "../../game/GameFlow";
import type { RankingEntry, SwordType } from "../../types";
import { weaponUrl } from "../../game/assets";
import { SWORD_BASES } from "../../game/data/swords";
import { RANKING_ENABLED } from "../../services/rankingConfig";
import { fetchRanking, getPlayerName } from "../../services/rankingService";
import { button, el, screenEl } from "../components";

const SWORD_TYPES = Object.keys(SWORD_BASES) as SwordType[];

function renderStatus(message: string, retry?: () => void): HTMLElement {
  const box = el("div", "ranking-status", message);
  if (retry) {
    const retryButton = button("再試行", "menu-btn", retry);
    retryButton.classList.add("compact");
    box.appendChild(retryButton);
  }
  return box;
}

function renderTable(entries: RankingEntry[]): HTMLElement {
  const currentName = getPlayerName();
  const wrap = el("div", "ranking-table-wrap");
  const table = el("table", "ranking-table");
  const thead = el("thead");
  const headRow = el("tr");
  ["順位", "プレイヤー", "キャラ", "武器", "階層"].forEach((label) => headRow.appendChild(el("th", undefined, label)));
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el("tbody");
  entries.forEach((entry, index) => {
    const tr = el("tr");
    if (currentName && entry.player_name === currentName) tr.classList.add("self");
    tr.appendChild(el("td", "rank-cell", String(index + 1)));
    tr.appendChild(el("td", undefined, entry.player_name));
    tr.appendChild(el("td", undefined, entry.character_name));

    const weapon = el("td");
    const weaponBox = el("div", "ranking-weapon");
    const icon = el("img", "ranking-weapon-icon") as HTMLImageElement;
    icon.src = weaponUrl(entry.sword_type);
    icon.alt = "";
    const name = el("span", undefined, entry.sword_name);
    const level = el("span", "ranking-weapon-level", `Lv.${entry.sword_level}`);
    weaponBox.append(icon, name, level);
    weapon.appendChild(weaponBox);
    tr.appendChild(weapon);

    tr.appendChild(el("td", "floor-cell", `${entry.floor}F`));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// SC-012 ランキング画面
export function renderRanking(flow: GameFlow): HTMLElement {
  const s = screenEl();
  s.appendChild(el("h2", undefined, "🏆 ランキング"));

  if (!RANKING_ENABLED) {
    s.appendChild(renderStatus("ランキングは準備中です"));
    s.appendChild(el("div", "spacer"));
    s.appendChild(button("← タイトルへ戻る", "menu-btn", () => flow.ui.showTitle()));
    return s;
  }

  const filter = el("label", "ranking-filter");
  filter.appendChild(el("span", undefined, "武器種別"));
  const select = el("select", "ranking-select") as HTMLSelectElement;
  const all = el("option") as HTMLOptionElement;
  all.value = "";
  all.textContent = "総合（すべて）";
  select.appendChild(all);
  for (const type of SWORD_TYPES) {
    const option = el("option") as HTMLOptionElement;
    option.value = type;
    option.textContent = SWORD_BASES[type].nameJa;
    select.appendChild(option);
  }
  filter.appendChild(select);
  s.appendChild(filter);

  const content = el("div", "ranking-content");
  s.appendChild(content);

  const load = async (): Promise<void> => {
    content.innerHTML = "";
    content.appendChild(renderStatus("読み込み中…"));
    const selected = select.value as SwordType | "";
    try {
      const rows = await fetchRanking(selected || undefined, 100);
      content.innerHTML = "";
      content.appendChild(rows.length > 0 ? renderTable(rows) : renderStatus("まだ記録がありません"));
    } catch {
      content.innerHTML = "";
      content.appendChild(renderStatus("ランキングを取得できませんでした（オフラインかもしれません）", () => void load()));
    }
  };

  select.addEventListener("change", () => void load());
  void load();

  s.appendChild(el("div", "spacer"));
  s.appendChild(button("← タイトルへ戻る", "menu-btn", () => flow.ui.showTitle()));
  return s;
}
