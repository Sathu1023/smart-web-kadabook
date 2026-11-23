import { test as base, expect } from "@playwright/test";
import {
  defaultStoryScreens,
  getStoryDemo,
  storyPanels,
} from "../src/storyDemos.js";
const storyLast = storyPanels.length - 1;

const test = base.extend({
  errors: [
    async ({ page }, use) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await use();
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});
const contained = (a, b, tolerance = 2) =>
  a.x >= b.x - tolerance &&
  a.y >= b.y - tolerance &&
  a.x + a.width <= b.x + b.width + tolerance &&
  a.y + a.height <= b.y + b.height + tolerance;
const angle = (value) => Math.abs(Math.atan2(Math.sin(value), Math.cos(value)));
async function ready(page, index = 0) {
  await page.goto("/");
  await expect(page.locator(".kadabook-site")).toHaveAttribute(
    "data-scene-state",
    "ready",
  );
  await scrollToScene(page, index);
}
async function scrollToScene(page, index) {
  await page.evaluate(
    ([index, last]) =>
      scrollTo({
        top:
          (index / last) *
          (document.getElementById("story").offsetHeight - innerHeight),
        behavior: "instant",
      }),
    [index, storyLast],
  );
  await expect
    .poll(async () => (await layout(page)).index, { timeout: 45000 })
    .toBe(index);
}
async function layout(page) {
  return page
    .locator(".kadabook-site")
    .evaluate((root) => JSON.parse(root.dataset.sceneLayout || "{}"));
}
async function demo(page) {
  return page
    .locator(".kadabook-site")
    .evaluate((root) => JSON.parse(root.dataset.sceneDemo || "{}"));
}
async function clickChip(page, label) {
  const chip = (await layout(page)).chips.find((chip) => chip.label === label);
  expect(chip, `Projected chip: ${label}`).toBeTruthy();
  await page.mouse.click(chip.x + chip.width / 2, chip.y + chip.height / 2);
  await expect.poll(async () => (await demo(page)).requested).toBe(label);
}
async function expectSelection(page, index, label) {
  await expect(
    page.locator(`[data-demo-scene="${index}"][aria-pressed="true"]`),
  ).toHaveCount(label ? 1 : 0);
  if (label) {
    await expect(
      page.locator(`[data-demo-scene="${index}"][data-demo-chip="${label}"]`),
    ).toHaveAttribute("aria-pressed", "true");
  }
}

test("Only genuine supplied state screenshots are mapped", () => {
  const images = Object.fromEntries(
    [
      "dash",
      "sale",
      "menu",
      "salesList",
      "quickSale",
      "hold",
      "kitchen",
      "staff",
      "gmonth",
      "credit",
      "printPreview",
      "productEdit",
      "excel",
    ].map((key) => [key, {}]),
  );
  for (const [index, label, key, showing] of [
    [1, "Quick Sale", "quickSale", "Quick Sale · Tamil"],
    [1, "Sales history", "salesList", "Daily sales list · Tamil"],
    [1, "Daily summary", "dash", "Daily dashboard overview · Tamil"],
    [2, "Products & stock", "menu", "Products · All items · Tamil"],
    [1, "Credit Book + WhatsApp reminders", "credit", "Credit book · Tamil"],
    [2, "Receipt print", "printPreview", "Bill print preview · Tamil"],
    [2, "Barcode", "productEdit", "Product barcode · Tamil"],
    [2, "Excel export", "excel", "Excel export · Tamil"],
    [
      2,
      "Reports & profit",
      "gmonth",
      "Monthly sales report · Tamil",
    ],
    [
      3,
      "Kitchen & stock engine",
      "kitchen",
      "Kitchen & stock · Tamil",
    ],
    [3, "Staff logins & permissions", "staff", "Staff logins & permissions · Tamil"],
  ]) {
    expect(getStoryDemo(index, label, images)).toMatchObject({
      key,
      showing,
      available: true,
    });
  }
  for (const [index, label] of [
    [2, "Expenses"],
    [3, "Branches"],
    [3, "Suppliers"],
  ]) {
    expect(
      getStoryDemo(index, label, { ...images, exp: {}, rep: {} }),
    ).toMatchObject({
      key: null,
      available: false,
    });
  }
  expect(getStoryDemo(1, "Quick Sale", { sale: {} })).toMatchObject({
    key: "quickSale",
    available: false,
  });
  expect(defaultStoryScreens[2]).toBe("menu");
  expect(getStoryDemo(1, "Unknown", {})).toBeNull();
});

test("Keyboard activates the semantic screenshot buttons and announces the actual selection", async ({
  page,
}) => {
  await ready(page, 1);
  const before = await demo(page);
  const button = page.locator(
    '[data-demo-scene="1"][data-demo-chip="Daily summary"]',
  );
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await demo(page)).screen).toBe("dash");
  const current = await demo(page);
  expect(current.textureVersion).toBeGreaterThan(before.textureVersion);
  expect(current).toMatchObject({
    requested: "Daily summary",
    selected: "Daily summary",
    pending: false,
  });
  await expectSelection(page, 1, "Daily summary");
});

test.describe("Touch story controls", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("Tapping the rear phone faces its screen and a tool chip updates the actual image", async ({
    page,
  }) => {
    await ready(page);
    const back = (await layout(page)).models[1];
    await page.touchscreen.tap(
      back.x + back.width / 2,
      back.y + back.height / 2,
    );
    await expect
      .poll(async () => angle((await layout(page)).phoneRotations[1].y))
      .toBeLessThan(0.15);
    await scrollToScene(page, 1);
    const chip = (await layout(page)).chips.find(
      (chip) => chip.label === "Daily summary",
    );
    await page.touchscreen.tap(
      chip.x + chip.width / 2,
      chip.y + chip.height / 2,
    );
    await expect.poll(async () => (await demo(page)).screen).toBe("dash");
    await expect(
      page.locator('[data-demo-scene="1"][data-demo-chip="Daily summary"]'),
    ).toHaveAttribute("aria-pressed", "true");
  });
});

for (const width of [1440, 390]) {
  test(`Canvas tool chips update the real screen texture and selection at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await ready(page, 1);
    let previous = await demo(page);
    for (const [label, key] of [
      ["Sales history", "salesList"],
      ["Daily summary", "dash"],
      ["Credit Book + WhatsApp reminders", "credit"],
    ]) {
      await clickChip(page, label);
      await expect.poll(async () => (await demo(page)).screen).toBe(key);
      const current = await demo(page);
      expect(current.textureVersion).toBeGreaterThan(previous.textureVersion);
      expect(current).toMatchObject({ selected: label, pending: false });
      await expectSelection(page, 1, label);
      for (const model of (await layout(page)).models)
        expect(contained(model, (await layout(page)).frameBounds)).toBe(true);
      previous = current;
    }
    // Selection survives rebuilding the canvas panels on resize.
    await page.setViewportSize({
      width: width === 1440 ? 1100 : 320,
      height: 820,
    });
    await expect
      .poll(() => page.evaluate(() => innerWidth))
      .not.toBe(width);
    await expect.poll(async () => (await demo(page)).screen).toBe("credit");
    expect((await demo(page)).textureVersion).toBe(previous.textureVersion);
    await expectSelection(page, 1, "Credit Book + WhatsApp reminders");
  });
}

test("All three Quick Sale chips switch their supplied textures and exclusive aria selection", async ({
  page,
}) => {
  await ready(page, 1);
  let previous = await demo(page);
  expect(previous.screen).toBe("quickSale");
  for (const [label, key, showing] of [
    ["Sales history", "salesList", "Daily sales list · Tamil"],
    ["Daily summary", "dash", "Daily dashboard overview · Tamil"],
    ["Quick Sale", "quickSale", "Quick Sale · Tamil"],
  ]) {
    await clickChip(page, label);
    await expect.poll(async () => (await demo(page)).screen).toBe(key);
    const current = await demo(page);
    expect(current).toMatchObject({ selected: label, showing, pending: false });
    expect(current.textureVersion).toBeGreaterThan(previous.textureVersion);
    await expect.poll(async () => (await layout(page)).screen).toBe(key);
    await expectSelection(page, 1, label);
    previous = current;
  }
});

test("Missing state screens stay honestly pending instead of showing a fake matching screen", async ({
  page,
}) => {
  for (const [index, labels, expectedScreen] of [
    [2, ["Expenses"], "menu"],
    [3, ["Branches", "Suppliers"], "kitchen"],
  ]) {
    await ready(page, index);
    for (const label of labels) {
      const before = await demo(page);
      await clickChip(page, label);
      const after = await demo(page);
      expect(after.pending).toBe(true);
      expect(after.screen).toBe(expectedScreen);
      expect(after.textureVersion).toBe(before.textureVersion);
      expect(after.selected).toBe(before.selected);
      expect(after.showing).toBe(before.showing);
      await expectSelection(page, index, before.selected);
    }
  }
});

test("Product stock and monthly reports swap; missing barcode preserves the selected view", async ({
  page,
}) => {
  await ready(page, 2);
  let previous = await demo(page);
  expect(previous).toMatchObject({
    screen: "menu",
    showing: "Products · All items · Tamil",
    pending: false,
  });
  for (const [label, key, showing] of [
    ["Reports & profit", "gmonth", "Monthly sales report · Tamil"],
    ["Barcode", "productEdit", "Product barcode · Tamil"],
    ["Products & stock", "menu", "Products · All items · Tamil"],
  ]) {
    await clickChip(page, label);
    await expect.poll(async () => (await demo(page)).screen).toBe(key);
    const current = await demo(page);
    expect(current).toMatchObject({ selected: label, showing, pending: false });
    expect(current.textureVersion).toBeGreaterThan(previous.textureVersion);
    await expectSelection(page, 2, label);
    previous = current;
  }
});

test("Complete-tier chips select real screens and keep the last selected image", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page, 3);
  let previous = await demo(page);
  expect(previous.screen).toBe("kitchen");
  for (const [label, key, showing] of [
    ["Staff logins & permissions", "staff", "Staff logins & permissions · Tamil"],
    [
      "Kitchen & stock engine",
      "kitchen",
      "Kitchen & stock · Tamil",
    ],
    ["Staff logins & permissions", "staff", "Staff logins & permissions · Tamil"],
  ]) {
    await clickChip(page, label);
    await expect.poll(async () => (await demo(page)).screen).toBe(key);
    const current = await demo(page);
    expect(current).toMatchObject({ selected: label, showing, pending: false });
    if (key === previous.screen) {
      expect(current.textureVersion).toBe(previous.textureVersion);
    } else {
      expect(current.textureVersion).toBeGreaterThan(previous.textureVersion);
    }
    await expect.poll(async () => (await layout(page)).screen).toBe(key);
    await expectSelection(page, 3, label);
    previous = current;
  }
  const contentBounds = (await layout(page)).content;
  await page.setViewportSize({ width: 1420, height: 900 });
  await expect
    .poll(async () => (await layout(page)).content)
    .not.toEqual(contentBounds);
  expect(await demo(page)).toMatchObject({
    screen: "staff",
    selected: "Staff logins & permissions",
    pending: false,
    textureVersion: previous.textureVersion,
  });
  await expectSelection(page, 3, "Staff logins & permissions");
  await scrollToScene(page, 1);
  await expect.poll(async () => (await demo(page)).screen).toBe("quickSale");
  const sales = await demo(page);
  await scrollToScene(page, 3);
  await expect.poll(async () => (await demo(page)).screen).toBe("staff");
  expect(await demo(page)).toMatchObject({
    selected: "Staff logins & permissions",
    pending: false,
  });
  expect((await demo(page)).textureVersion).toBeGreaterThan(
    sales.textureVersion,
  );
  await expectSelection(page, 3, "Staff logins & permissions");
});

for (const reducedMotion of ["reduce", "no-preference"]) {
  test(`Hover turns the rear phone to its actual front screen without escaping the frame (${reducedMotion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await ready(page);
    const initial = await layout(page);
    expect(angle(initial.phoneRotations[1].y)).toBeGreaterThan(2);
    const back = initial.models[1];
    await page.mouse.move(back.x + back.width / 2, back.y + back.height / 2);
    await expect.poll(async () => (await layout(page)).hoverPhone).toBe(1);
    await expect
      .poll(async () => angle((await layout(page)).phoneRotations[1].y), {
        timeout: 15000,
      })
      .toBeLessThan(0.15);
    const turned = await layout(page);
    expect(contained(turned.models[1], turned.frameBounds)).toBe(true);
    await page.mouse.move(0, 0);
    await expect.poll(async () => (await layout(page)).hoverPhone).toBe(-1);
    await expect
      .poll(async () => angle((await layout(page)).phoneRotations[1].y))
      .toBeGreaterThan(2);
  });
}

for (const [width, height] of [
  [1440, 900],
  [390, 844],
  [320, 700],
  [1024, 600],
]) {
  test(`Story text aligns fully inside its projected card at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await ready(page, 1);
    const current = await layout(page);
    for (const text of current.textBounds)
      expect(contained(text, current.cardBounds)).toBe(true);
    for (const chip of current.chips)
      expect(contained(chip, current.cardBounds)).toBe(true);
  });
}

test("Steps and benefit sections are compact with smaller type and icons", async ({
  page,
}) => {
  await ready(page);
  for (const selector of ["#how", "#why"]) {
    const section = page.locator(selector);
    await section.scrollIntoViewIfNeeded();
    expect(
      await section
        .locator("h2")
        .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
    ).toBeLessThanOrEqual(34);
    for (const card of await section.locator(".card").all()) {
      const box = await card.boundingBox();
      expect(box.height).toBeLessThanOrEqual(260);
      expect(
        (await card.locator(".ic").boundingBox()).width,
      ).toBeLessThanOrEqual(44);
    }
  }
});
