import { test as base, expect } from "@playwright/test";
import { computeStoryLayout } from "../src/storyLayout.js";
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
const cases = [
  [1440, 900],
  [1920, 900],
  [390, 844],
  [320, 700],
  [320, 568],
  [1024, 600],
  [844, 390],
];
const contained = (a, b, tolerance = 2) =>
  a.x >= b.x - tolerance &&
  a.y >= b.y - tolerance &&
  a.x + a.width <= b.x + b.width + tolerance &&
  a.y + a.height <= b.y + b.height + tolerance;
const overlaps = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;
async function settledLayout(page, index) {
  await expect
    .poll(
      () =>
        page
          .locator(".kadabook-site")
          .evaluate((e) => JSON.parse(e.dataset.sceneLayout || "{}").index),
      { timeout: 45000 },
    )
    .toBe(index);
  return page
    .locator(".kadabook-site")
    .evaluate((e) => JSON.parse(e.dataset.sceneLayout));
}
test("Composition helper scales short landscape content inside the header safe area", () => {
  for (const [width, height] of cases)
    for (let index = 0; index < storyPanels.length; index++) {
      const mobile = width < 720 || width / height < 0.95;
      const layout = computeStoryLayout({
        width,
        height,
        mobile,
        index,
        lastIndex: storyLast,
        panelWidth: mobile ? width * 0.9 : 380,
        panelHeight: mobile ? 310 : 350,
      });
      expect(layout.content.y).toBeGreaterThanOrEqual(82);
      expect(contained(layout.content, { x: 0, y: 0, width, height })).toBe(
        true,
      );
      expect(contained(layout.phones, layout.stage)).toBe(true);
    }
});
for (const [width, height] of cases) {
  test(`All story scenes contain their phones and keep content clear at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator(".kadabook-site")).toHaveAttribute(
      "data-scene-state",
      "ready",
    );
    for (let index = 0; index < storyPanels.length; index++) {
      await page.locator("#dots button").nth(index).click();
      const layout = await settledLayout(page, index);
      const headerBottom = await page
        .locator("header")
        .evaluate((e) => e.getBoundingClientRect().bottom);
      expect(layout.content.y).toBeGreaterThanOrEqual(headerBottom);
      expect(
        contained(layout.content, {
          x: 0,
          y: headerBottom,
          width,
          height: height - headerBottom,
        }),
      ).toBe(true);
      const mobile = width < 720 || width / height < 0.95;
      expect(layout.models).toHaveLength(
        (index === 0 || index === storyLast) && !(mobile && height < 640)
          ? 2
          : 1,
      );
      for (const model of layout.models) {
        expect(
          contained(model, layout.frameBounds),
          `Scene ${index}: model must remain inside its actual projected stage`,
        ).toBe(true);
        expect(
          overlaps(model, layout.content),
          `Scene ${index}: model must not cover text`,
        ).toBe(false);
      }
      if (index === storyLast) {
        expect(contained(layout.content, layout.stage)).toBe(true);
        expect(
          contained(layout.cardBounds, layout.frameBounds),
          "The final inner card stays inside the projected outer frame",
        ).toBe(true);
      }
    }
    for (const href of ["#how", "#why"]) {
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      const layout = await settledLayout(page, 0);
      const button = layout.buttons.find((b) => b.href === href);
      expect(button).toBeTruthy();
      await page.mouse.click(
        button.x + button.width / 2,
        button.y + button.height / 2,
      );
      await expect(page.locator(`${href} h2`)).toBeInViewport();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  });
}
