// E2E検証 その2: ボス撃破→ボス報酬 / 剣ドロップ→売却 / ポーズ→リタイア
import { chromium } from "playwright";

const SHOT_DIR = process.argv[2] ?? ".";
const URL = process.env.E2E_URL ?? "http://localhost:4173/";
const errors = [];
const log = (...a) => console.log("[verify2]", ...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});

const shot = (name) => page.screenshot({ path: `${SHOT_DIR}/${name}.png` });
const screenOpen = () => page.locator("#ui-root .screen").count().then((c) => c > 0);

// ボス階層(10F)直前の状態を注入: 高火力の剣 + コイン
await page.goto(URL);
await page.waitForSelector("#ui-root .screen", { timeout: 20000 });
await page.evaluate(() => {
  localStorage.clear();
  const sword = {
    id: "test-sword",
    name: "検証用の剣",
    type: "longSword",
    rarity: "epic",
    level: 0,
    attack: 400,
    attackSpeed: 2,
    criticalRate: 0.2,
    criticalMultiplier: 2,
    chargeMultiplier: 2.5,
    knockback: 10,
    effects: [{ type: "burn", level: 1 }],
    basePrice: 150,
    spentCoins: 0,
    sellPrice: 150,
  };
  const run = {
    floor: 10,
    playerHp: 100,
    playerMaxHp: 100,
    defense: 0,
    dodgeCharges: 2,
    coins: 500,
    equippedSword: sword,
    defeatedEnemies: 9,
    defeatedBosses: 0,
    totalCoinsEarned: 500,
    maxDamage: 0,
    startedAt: Date.now(),
    bestRarityFound: null,
    seed: 12345,
  };
  localStorage.setItem("sword-roguelite:suspend", JSON.stringify({ run, savedAt: Date.now() }));
});
await page.reload();
await page.waitForSelector("#ui-root .screen", { timeout: 20000 });
await page.waitForTimeout(300);

await page.getByRole("button", { name: /続きから/ }).click();
await page.waitForTimeout(900);
await shot("20-boss-battle");

let sawBossReward = false;
let sawPickup = false;
let soldSword = false;

outer: for (let round = 0; round < 30; round++) {
  // 戦闘: タップ連打
  for (let i = 0; i < 120; i++) {
    if (await screenOpen()) break;
    await page.mouse.click(422, 210);
    await page.waitForTimeout(180);
  }
  if (!(await screenOpen())) {
    log("stuck: no screen after battle loop, round", round);
    await shot("2x-stuck");
    break;
  }

  for (let guard = 0; guard < 6 && (await screenOpen()); guard++) {
    const text = await page.locator("#ui-root .screen").innerText();
    if (text.includes("ボス撃破")) {
      sawBossReward = true;
      await shot("21-boss-reward");
      log("boss reward screen OK");
      await page.getByRole("button", { name: "この剣を装備する" }).first().click();
      await page.waitForTimeout(400);
    } else if (text.includes("剣を発見")) {
      sawPickup = true;
      await shot("22-sword-pickup");
      log("pickup screen OK — selling");
      await page.getByRole("button", { name: /売却する/ }).click();
      soldSword = true;
      await page.waitForTimeout(400);
    } else if (text.includes("クリア")) {
      if (sawPickup) break outer; // 目的達成
      await page.getByRole("button", { name: /次の階層へ/ }).click();
      await page.waitForTimeout(700);
      break;
    } else if (text.includes("力尽きた")) {
      log("unexpected death");
      await shot("2x-death");
      break outer;
    } else {
      log("unknown screen:", text.slice(0, 60));
      break outer;
    }
  }
}

// ポーズ → リタイア
if (await screenOpen()) {
  // 報酬画面が開いていれば次へ進んで戦闘に戻る
  const next = page.getByRole("button", { name: /次の階層へ/ });
  if ((await next.count()) > 0) {
    await next.click();
    await page.waitForTimeout(700);
  }
}
if (!(await screenOpen())) {
  await page.getByRole("button", { name: /ポーズ/ }).click();
  await page.waitForTimeout(400);
  await shot("23-pause");
  const retire = page.getByRole("button", { name: /リタイア/ });
  await retire.click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /もう一度タップ/ }).click();
  await page.waitForTimeout(700);
  await shot("24-result-retire");
  const resultText = await page.locator("#ui-root .screen").innerText();
  log("result screen includes リタイア:", resultText.includes("リタイア"));
  log("result floor line:", resultText.split("\n").find((l) => l.includes("到達階層")));
}

const save = await page.evaluate(() => JSON.parse(localStorage.getItem("sword-roguelite:save")));
log("tutorialCompleted (should be true after boss):", save.tutorialCompleted);
log("discoveredSwords:", save.discoveredSwords);
log("highestFloor:", save.highestFloor);

log("=== SUMMARY ===");
log("boss reward:", sawBossReward, "/ pickup:", sawPickup, "/ sold:", soldSword);
log("js errors:", errors.length ? errors : "none");

await browser.close();
process.exit(errors.length > 0 ? 1 : 0);
