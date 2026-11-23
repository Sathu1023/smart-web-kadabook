import { test as base, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { storyPanels } from "../src/storyDemos.js";
const storyLast = storyPanels.length - 1;
const test = base.extend({
  errors: [
    async ({ page }, use) => {
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await use();
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});
const controls = (page) =>
  page
    .locator(".kadabook-site")
    .evaluate((e) => JSON.parse(e.dataset.sceneControls || "[]"));
const demo = (page) =>
  page
    .locator(".kadabook-site")
    .evaluate((e) => JSON.parse(e.dataset.sceneDemo || "{}"));
async function scrollScene(page, index) {
  await page.evaluate(
    ([i, last]) =>
      scrollTo({
        top:
          (i / last) *
          (document.querySelector("#story").offsetHeight - innerHeight),
        behavior: "instant",
      }),
    [index, storyLast],
  );
}
async function ready(page, index = 1) {
  await page.goto("/");
  await expect(page.locator(".kadabook-site")).toHaveAttribute(
    "data-scene-state",
    "ready",
  );
  await scrollScene(page, index);
  await expect
    .poll(
      () =>
        page
          .locator(".kadabook-site")
          .evaluate((e) => JSON.parse(e.dataset.sceneLayout || "{}").index),
      { timeout: 45000 },
    )
    .toBe(index);
}
async function chip(page, label) {
  return (await controls(page)).find((c) => c.label === label);
}
async function click(page, label, edge = false) {
  const c = await chip(page, label);
  expect(c).toBeTruthy();
  await page.mouse.click(c.x + (edge ? 3 : c.width / 2), c.y + c.height / 2);
  await expect.poll(async () => (await demo(page)).requested).toBe(label);
}

test("All imported app screenshots are the supplied Tamil PNGs, not older English assets", () => {
  const source = readFileSync(
    new URL("../src/App.jsx", import.meta.url),
    "utf8",
  );
  const files = [
    "H1-home-ta-v2.png",
    "P1-products.png",
    "R1-sales-list.png",
    "S1-main.png",
    "S7-menu-sale.png",
    "S11-hold-list.png",
    "M10-kitchen.png",
    "M7-staff.png",
    "H5-month-detail.png",
    "C1-credit-list.png",
    "C2-reminder.png",
    "S8-bill.png",
    "S14-print-preview.png",
    "M11-excel-tools.png",
  ];
  for (const name of files) {
    expect(source).toContain(`./assets/${name}`);
    const png = readFileSync(new URL(`../src/assets/${name}`, import.meta.url));
    expect(png.readUInt32BE(16)).toBe(473);
    expect(png.readUInt32BE(20)).toBe(1024);
  }
  expect(source).not.toMatch(/from ["']\.\/assets\/[^"']+\.jpg/);
});

for (const reducedMotion of ["reduce", "no-preference"]) {
  test(`Visible controls remain clickable between scenes and at their edges (${reducedMotion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await ready(page);
    await scrollScene(page, 1.22);
    await expect
      .poll(async () => (await chip(page, "Quick Sale"))?.opacity)
      .toBeLessThan(0.95);
    expect((await chip(page, "Quick Sale")).opacity).toBeGreaterThan(0.08);
    await click(page, "Quick Sale", true);
    await expect.poll(async () => (await demo(page)).screen).toBe("quickSale");
    await click(page, "Sales history", true);
    await expect.poll(async () => (await demo(page)).screen).toBe("salesList");
  });
}

test.describe("High-DPI pointer feedback", () => {
  test.use({ deviceScaleFactor: 2 });
  test("Hover paints immediately, restores on leave, and never shifts or rescales chip text", async ({
    page,
  }) => {
    await ready(page);
    const c = await chip(page, "Quick Sale");
    const clip = {
      x: c.x + 5,
      y: c.y + 5,
      width: c.width - 10,
      height: c.height - 10,
    };
    const before = await page.screenshot({ clip });
    await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
    await expect(page.locator(".kadabook-site")).toHaveAttribute(
      "data-control-hover",
      "Quick Sale",
    );
    await expect
      .poll(async () => (await chip(page, "Quick Sale")).hover)
      .toBe(true);
    const hovering = await page.screenshot({ clip });
    expect(hovering.equals(before)).toBe(false);
    const after = await chip(page, "Quick Sale");
    for (const k of ["x", "y", "width", "height"])
      expect(after[k]).toBeCloseTo(c[k], 3);
    expect(after.textureScale).toBe(2);
    await page.mouse.move(0, 0);
    await expect(page.locator(".kadabook-site")).toHaveAttribute(
      "data-control-hover",
      "",
    );
    await expect
      .poll(async () => (await chip(page, "Quick Sale")).hover)
      .toBe(false);
    expect((await page.screenshot({ clip })).equals(before)).toBe(true);
    await click(page, "Quick Sale");
    await click(page, "Sales history");
    await click(page, "Daily summary");
    for (const control of await controls(page))
      expect(control.textureScale).toBe(2);
  });
});

test("Dragging off a chip cancels selection; resize and returning to a control still work", async ({
  page,
}) => {
  await ready(page);
  const c = await chip(page, "Quick Sale");
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
  await page.mouse.down();
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2 + 15);
  await page.mouse.up();
  expect((await demo(page)).requested).toBeNull();
  await page.setViewportSize({ width: 390, height: 844 });
  await scrollScene(page, 1);
  // Wait for the responsive card rebuild, not a transient projection of old geometry.
  await expect
    .poll(() =>
      page
        .locator(".kadabook-site")
        .evaluate(
          (e) => JSON.parse(e.dataset.sceneLayout || "{}").content?.width,
        ),
    )
    .toBeLessThan(390);
  await expect
    .poll(async () => (await chip(page, "Quick Sale"))?.y)
    .toBeGreaterThan(500);
  await click(page, "Quick Sale");
  await expect.poll(async () => (await demo(page)).screen).toBe("quickSale");
});

test("Missing Tamil expenses stays explicitly unavailable, not a mislabeled Quick Sale image", async ({
  page,
}) => {
  await ready(page, 2);
  await click(page, "Expenses");
  expect(await demo(page)).toMatchObject({ screen: "menu", pending: true });
  await scrollScene(page, 1);
  await expect.poll(async () => (await demo(page)).index).toBe(1);
  expect(await demo(page)).toMatchObject({
    screen: "quickSale",
    showing: "Quick Sale · Tamil",
  });
});

test("Fallback screenshot buttons retain full-area click and keyboard activation without WebGL", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /webgl/.test(type) ? null : original.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await expect(page.locator(".kadabook-site")).toHaveAttribute(
    "data-scene-state",
    "fallback",
  );
  const panel = page.locator('.p[data-i="1"]');
  const image = panel.locator(".fallback-preview img");
  const initial = await image.getAttribute("src");
  await panel
    .locator('[data-demo-chip="Sales history"]')
    .click({ position: { x: 4, y: 15 } });
  await expect(panel.locator("output")).toContainText("Daily sales list");
  await expect(image).not.toHaveAttribute("src", initial);
  const quick = await image.getAttribute("src");
  await panel.locator('[data-demo-chip="Daily summary"]').focus();
  await page.keyboard.press("Enter");
  await expect(panel.locator("output")).toContainText(
    "Daily dashboard overview",
  );
  await expect(image).not.toHaveAttribute("src", quick);
  await expect(
    panel.locator('[data-demo-chip="Daily summary"]'),
  ).toHaveAttribute("aria-pressed", "true");
});

test("Faded story navigation cannot intercept content clicks", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#why").scrollIntoViewIfNeeded();
  await expect(page.locator("#dots")).toHaveCSS("pointer-events", "none");
  for (const dot of await page.locator("#dots button").all())
    await expect(dot).toHaveAttribute("tabindex", "-1");
});

for (const [width, height, reducedMotion] of [
  [320, 700, "reduce"],
  [390, 844, "reduce"],
  [1440, 900, "reduce"],
  [390, 844, "no-preference"],
]) {
  test(`Tamil gallery phones stay inside the canvas before and after selection (${width}, ${reducedMotion})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion });
    await ready(page);
    const gallery = page.locator("#galc");
    await gallery.scrollIntoViewIfNeeded();
    await gallery.focus();
    const layout = () =>
      page
        .locator(".kadabook-site")
        .evaluate((e) => JSON.parse(e.dataset.galleryLayout || "{}"));
    for (const [key, index] of [
      [null, -1],
      ["Home", 0],
      ["ArrowRight", 1],
      ["End", 2],
      ["Escape", -1],
    ]) {
      if (key) await page.keyboard.press(key);
      await expect.poll(async () => (await layout()).index).toBe(index);
      await expect
        .poll(async () => {
          const current = await layout();
          return current.phones?.every(
            (p) =>
              p.x >= 2 &&
              p.y >= 2 &&
              p.x + p.width <= current.width - 2 &&
              p.y + p.height <= current.height - 2,
          );
        })
        .toBe(true);
      if (index >= 0) {
        await expect
          .poll(async () => {
            const current = await layout(),
              selected = current.phones[index];
            return Math.abs(
              selected.x + selected.width / 2 - current.width / 2,
            );
          })
          .toBeLessThan(2);
      }
      await expect
        .poll(async () => {
          const phones = [...(await layout()).phones].sort((a, b) => a.x - b.x);
          return phones
            .slice(1)
            .every((phone, i) => phone.x > phones[i].x + phones[i].width + 2);
        })
        .toBe(true);
    }
  });
}
