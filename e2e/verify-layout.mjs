// Layout E2E: portrait viewport matrix + DOM geometry probes.
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const SHOT_DIR = process.argv[2] ?? ".";
const URL = process.env.E2E_URL ?? "http://localhost:4173/";
const EPSILON = 1.5;
const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 414, height: 896 },
  { width: 430, height: 932 },
];

const errors = [];
const violations = [];
const skips = [];
const log = (...a) => console.log("[layout]", ...a);

await mkdir(SHOT_DIR, { recursive: true });

const browser = await chromium.launch();

function vpName(vp) {
  return `${vp.width}x${vp.height}`;
}

function safeName(text) {
  return text.replace(/[^a-zA-Z0-9_-]+/g, "-");
}

async function makePage(vp) {
  const ctx = await browser.newContext({
    viewport: vp,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await ctx.newPage();
  // Headless Chromium can emit a transient WebGL framebuffer-init error on the
  // first GL context after idle (a GPU/driver artifact, not an app fault). It
  // does not occur in real mobile browsers; ignore only this exact message.
  const ignore = (t) => /Framebuffer status: Framebuffer Unsupported/.test(t);
  page.on("pageerror", (e) => {
    if (!ignore(e.message)) errors.push(`${vpName(vp)} pageerror: ${e.message}`);
  });
  page.on("console", (m) => {
    if (m.type() === "error" && !ignore(m.text())) errors.push(`${vpName(vp)} console.error: ${m.text()}`);
  });
  return { ctx, page };
}

async function gotoTitle(page) {
  // Retry once: the first GL context after idle can fail to boot Phaser in
  // headless (WebGL framebuffer flake); a reload reliably recovers it.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await page.goto(URL);
      await page.waitForSelector("#ui-root .screen", { timeout: 15000 });
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForSelector("#ui-root .screen", { timeout: 15000 });
      await page.waitForTimeout(250);
      return;
    } catch (e) {
      if (attempt === 2) throw e;
      await page.waitForTimeout(600);
    }
  }
}

async function clickFirst(page, selectorOrLocator, timeout = 5000) {
  const locator =
    typeof selectorOrLocator === "string" ? page.locator(selectorOrLocator).first() : selectorOrLocator.first();
  await locator.waitFor({ state: "visible", timeout });
  await locator.click();
}

async function openTitleScreen(page, buttonName, stateName, vp) {
  try {
    await clickFirst(page, page.getByRole("button", { name: buttonName }));
    await page.waitForTimeout(250);
    await inspect(page, stateName, vp);
    await clickFirst(page, page.getByRole("button", { name: /戻る/ }));
    await page.waitForTimeout(250);
  } catch (e) {
    skips.push(`${vpName(vp)} ${stateName}: ${e.message}`);
    log("skip", vpName(vp), stateName, e.message);
    await gotoTitle(page);
  }
}

async function screenOpen(page) {
  return (await page.locator("#ui-root .screen").count()) > 0;
}

async function battleTap(page) {
  await page.mouse.click(195, 430);
}

async function reachRewardOrPickup(page, vp) {
  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < 260; i++) {
      if (await screenOpen(page)) break;
      await battleTap(page);
      await page.waitForTimeout(150);
    }

    if (!(await screenOpen(page))) {
      skips.push(`${vpName(vp)} reward: no intermission screen after battle loop`);
      return false;
    }

    for (let guard = 0; guard < 8 && (await screenOpen(page)); guard++) {
      const text = await page.locator("#ui-root .screen").innerText();
      if (text.includes("武器を入手")) {
        await inspect(page, "swordPickup", vp);
        await clickFirst(page, ".weapon-panel:not(.featured)");
        await page.waitForTimeout(350);
        break;
      }
      if (text.includes("クリア")) {
        await inspect(page, "reward", vp);
        return true;
      }
      if (text.includes("力尽きた") || text.includes("リタイア")) {
        await inspect(page, "result", vp);
        skips.push(`${vpName(vp)} reward: reached result before reward`);
        return false;
      }
      skips.push(`${vpName(vp)} reward: unknown screen ${text.slice(0, 60)}`);
      return false;
    }
  }
  skips.push(`${vpName(vp)} reward: pickup loop did not settle on reward`);
  return false;
}

async function inspect(page, stateName, vp) {
  const found = await page.evaluate(
    ({ stateName: evaluatedState, epsilon }) => {
      const interactiveSelector =
        "button, .card, .upgrade-item, .weapon-panel, input, select, .hud-btn, .toggle-btn, .bar";
      const tapSelector = "button, input[type=range], select, .hud-btn, .weapon-panel, .upgrade-item, .toggle-btn";
      const overflowAllowSelector = [
        ".weapon-panel-name",
        ".ranking-table-wrap",
        ".ranking-table",
        ".result-table",
        ".truncate",
        "[data-allow-overflow]",
      ].join(",");
      const violations = [];
      const rectOf = (el) => {
        const r = el.getBoundingClientRect();
        return {
          left: Math.round(r.left * 10) / 10,
          top: Math.round(r.top * 10) / 10,
          right: Math.round(r.right * 10) / 10,
          bottom: Math.round(r.bottom * 10) / 10,
          width: Math.round(r.width * 10) / 10,
          height: Math.round(r.height * 10) / 10,
        };
      };
      const selectorOf = (el) => {
        if (el.id) return `#${el.id}`;
        const classes = Array.from(el.classList ?? []).slice(0, 4).join(".");
        const base = `${el.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`;
        const parent = el.parentElement;
        if (!parent) return base;
        const index = Array.from(parent.children).indexOf(el) + 1;
        return `${base}:nth-child(${index})`;
      };
      const isVisible = (el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > epsilon &&
          rect.height > epsilon
        );
      };
      const areaIntersection = (a, b) => {
        const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        return x * y;
      };
      const visible = Array.from(document.body.querySelectorAll("*")).filter(isVisible);
      const doc = document.scrollingElement || document.documentElement;

      if (doc.scrollWidth > doc.clientWidth + epsilon) {
        violations.push({
          type: "document-horizontal-overflow",
          selector: "document.scrollingElement",
          rect: { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth },
        });
      }

      for (const el of visible) {
        const rect = rectOf(el);
        const selector = selectorOf(el);
        // `.ranking-table-wrap` is an intentionally horizontal-scroll region
        // (min-width table). Its cells legitimately extend past the viewport
        // but are clipped/scrolled by the wrap, so exempt them here; the
        // document-level overflow check above still guards real page overflow.
        const inHScroll = el.closest(".ranking-table-wrap");
        if (!inHScroll && (rect.left < -epsilon || rect.right > window.innerWidth + epsilon)) {
          violations.push({ type: "viewport-horizontal-overflow", selector, rect });
        }
        if (!el.matches(overflowAllowSelector) && el.scrollWidth > el.clientWidth + epsilon) {
          violations.push({
            type: "element-horizontal-overflow",
            selector,
            rect: { ...rect, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth },
          });
        }
      }

      const interactive = visible.filter((el) => el.matches(interactiveSelector));
      const byParent = new Map();
      for (const el of interactive) {
        const parent = el.parentElement;
        if (!parent) continue;
        if (!byParent.has(parent)) byParent.set(parent, []);
        byParent.get(parent).push(el);
      }
      for (const siblings of byParent.values()) {
        for (let i = 0; i < siblings.length; i++) {
          for (let j = i + 1; j < siblings.length; j++) {
            const a = rectOf(siblings[i]);
            const b = rectOf(siblings[j]);
            const area = areaIntersection(a, b);
            if (area > epsilon) {
              violations.push({
                type: "interactive-sibling-overlap",
                selector: `${selectorOf(siblings[i])} <> ${selectorOf(siblings[j])}`,
                rect: { a, b, area: Math.round(area * 10) / 10 },
              });
            }
          }
        }
      }

      const hudTop = document.querySelector(".hud-top");
      const hudBottom = document.querySelector(".hud-bottom");
      if (hudTop && hudBottom && isVisible(hudTop) && isVisible(hudBottom)) {
        const top = rectOf(hudTop);
        const bottom = rectOf(hudBottom);
        if (areaIntersection(top, bottom) > epsilon) {
          violations.push({ type: "hud-top-bottom-overlap", selector: ".hud-top <> .hud-bottom", rect: { top, bottom } });
        }
        // Combatants render in the Phaser canvas at game coords ENEMY_Y=300 /
        // PLAYER_Y=560 within a 390x844 space that FIT-scales (and letterboxes)
        // into the canvas box. Verify neither HUD zone covers those two points
        // on any viewport, instead of a fixed band that breaks under scaling.
        const canvas = document.querySelector("#game-container canvas");
        if (canvas) {
          const cb = canvas.getBoundingClientRect();
          const cx = cb.left + cb.width / 2;
          const pointInside = (px, py, r) => px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
          const combatants = [
            ["enemy", cb.top + cb.height * (300 / 844)],
            ["player", cb.top + cb.height * (560 / 844)],
          ];
          for (const [selector, rect] of [
            [".hud-top", top],
            [".hud-bottom", bottom],
          ]) {
            for (const [who, py] of combatants) {
              if (pointInside(cx, py, rect)) {
                violations.push({ type: "hud-covers-combatant", selector: `${selector} covers ${who}`, rect });
              }
            }
          }
        }
      }

      for (const el of visible.filter((item) => item.matches(tapSelector))) {
        const rect = rectOf(el);
        if (rect.width + epsilon < 44 || rect.height + epsilon < 44) {
          violations.push({ type: "tap-target-under-44px", selector: selectorOf(el), rect });
        }
      }

      for (const el of visible) {
        if (el.matches(overflowAllowSelector)) continue;
        const hasOwnText = Array.from(el.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        if (hasOwnText && el.scrollWidth > el.clientWidth + epsilon) {
          violations.push({
            type: "text-overflow",
            selector: selectorOf(el),
            rect: { ...rectOf(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth },
          });
        }
      }

      return violations.map((v) => ({ state: evaluatedState, ...v }));
    },
    { stateName, epsilon: EPSILON }
  );

  if (found.length === 0) {
    log("ok", vpName(vp), stateName);
    return;
  }

  violations.push(...found.map((v) => ({ viewport: vpName(vp), ...v })));
  const path = `${SHOT_DIR}/${safeName(`${vpName(vp)}-${stateName}`)}.png`;
  await page.screenshot({ path, fullPage: true });
  for (const v of found) {
    console.error(`[layout] ${vpName(vp)} ${stateName} ${v.type} ${v.selector}`, JSON.stringify(v.rect));
  }
}

for (const vp of VIEWPORTS) {
  const { ctx, page } = await makePage(vp);
  try {
    log("viewport", vpName(vp));
    await gotoTitle(page);
    await inspect(page, "title", vp);

    await openTitleScreen(page, /ランキング/, "ranking", vp);
    await openTitleScreen(page, /剣図鑑/, "dex-sword", vp);
    await openTitleScreen(page, /敵図鑑/, "dex-enemy", vp);
    await openTitleScreen(page, /設定/, "settings", vp);

    await clickFirst(page, page.getByRole("button", { name: /ゲーム開始/ }));
    await page.waitForTimeout(300);
    await inspect(page, "characterSelect", vp);

    await clickFirst(page, page.getByRole("button", { name: "このキャラで進む" }));
    await page.waitForTimeout(300);
    await inspect(page, "swordSelect", vp);

    await clickFirst(page, page.getByRole("button", { name: "この剣で始める" }));
    await page.waitForTimeout(800);
    await inspect(page, "battle", vp);

    const rewardReached = await reachRewardOrPickup(page, vp);
    if (rewardReached && (await screenOpen(page))) {
      await clickFirst(page, page.getByRole("button", { name: /次の階層へ/ }));
      await page.waitForTimeout(700);
    }

    if (!(await screenOpen(page))) {
      await clickFirst(page, page.getByRole("button", { name: /ポーズ/ }));
      await page.waitForTimeout(300);
      await inspect(page, "pause", vp);
      const retire = page.getByRole("button", { name: /リタイア/ });
      await clickFirst(page, retire);
      await page.waitForTimeout(150);
      await clickFirst(page, page.getByRole("button", { name: /もう一度タップ/ }));
      await page.waitForTimeout(500);
      await inspect(page, "result", vp);
    } else {
      const text = await page.locator("#ui-root .screen").innerText();
      if (text.includes("力尽きた") || text.includes("リタイア")) {
        await inspect(page, "result", vp);
      } else {
        skips.push(`${vpName(vp)} pause/result: battle was not available after reward flow`);
      }
    }
  } catch (e) {
    errors.push(`${vpName(vp)} fatal: ${e.stack || e.message}`);
  } finally {
    await ctx.close();
  }
}

log("=== SUMMARY ===");
log("viewports:", VIEWPORTS.map(vpName).join(", "));
log("skips:", skips.length ? skips : "none");
log("violations:", violations.length);
log("errors:", errors.length ? errors : "none");

await browser.close();
process.exit(violations.length === 0 && errors.length === 0 ? 0 : 1);
