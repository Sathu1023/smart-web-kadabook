import { test as base, expect } from "@playwright/test";

const test = base.extend({
  noJavaScriptErrors: [
    async ({ page }, use) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await use();
      expect(errors, "No uncaught JavaScript errors").toEqual([]);
    },
    { auto: true },
  ],
});

async function openReady(page) {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(page.locator(".kadabook-site")).toHaveAttribute(
    "data-scene-state",
    "ready",
  );
  await expect(page.locator("body")).toHaveClass(/\bgl3d\b/);
}

async function iconGlow(card) {
  return card.locator(".ic").evaluate((icon) => {
    const style = getComputedStyle(icon, "::after");
    return {
      name: style.animationName,
      iterations: style.animationIterationCount,
    };
  });
}

async function settleFiniteAnimations(card) {
  await card.evaluate(async (element) => {
    // Let hover transitions start, then await them without waiting on the glow.
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    await Promise.allSettled(
      element
        .getAnimations({ subtree: true })
        .filter((animation) =>
          Number.isFinite(animation.effect.getComputedTiming().endTime),
        )
        .map((animation) => animation.finished),
    );
  });
}

const layouts = [
  [1440, 3],
  [1000, 3],
  [768, 2],
  [599, 1],
  [390, 1],
  [320, 1],
];

for (const [width, columns] of layouts) {
  test(`Feature cards form ${columns} columns with equal heights at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openReady(page);
    const cards = page.locator("#why .grid > .card");
    await expect(cards).toHaveCount(6);
    await page.locator("#why .grid").scrollIntoViewIfNeeded();

    const boxes = await cards.evaluateAll((elements) =>
      elements.map((element, index) => {
        const box = element.getBoundingClientRect();
        const heading = element.querySelector("h3");
        return {
          index,
          x: box.x + scrollX,
          y: box.y + scrollY,
          width: box.width,
          height: box.height,
          headingHeight: heading.getBoundingClientRect().height,
          headingLineHeight: parseFloat(getComputedStyle(heading).lineHeight),
        };
      }),
    );
    // Group actual rendered y coordinates, not the declared grid template.
    const rows = [];
    for (const box of [...boxes].sort((a, b) => a.y - b.y || a.x - b.x)) {
      let row = rows.find((items) => Math.abs(items[0].y - box.y) <= 1);
      if (!row) {
        row = [];
        rows.push(row);
      }
      row.push(box);
    }
    for (const row of rows) row.sort((a, b) => a.x - b.x);
    expect(rows.map((row) => row.length)).toEqual(
      Array(6 / columns).fill(columns),
    );
    expect(rows.flat().map((box) => box.index)).toEqual([0, 1, 2, 3, 4, 5]);

    rows.forEach((row, rowIndex) => {
      row.forEach((box, columnIndex) => {
        expect(Math.abs(box.y - row[0].y)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.x - rows[0][columnIndex].x)).toBeLessThanOrEqual(1);
        if (columnIndex > 0) {
          const previous = row[columnIndex - 1];
          expect(box.x).toBeGreaterThan(previous.x + previous.width);
        }
        if (rowIndex > 0) {
          const previous = rows[rowIndex - 1][columnIndex];
          expect(box.y).toBeGreaterThan(previous.y + previous.height);
        }
        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThan(0);
        expect(box.headingHeight).toBeGreaterThanOrEqual(
          2 * box.headingLineHeight - 1,
        );
      });
    });
    for (const dimension of ["height", "width"]) {
      const values = boxes.map((box) => box[dimension]);
      expect(
        Math.max(...values) - Math.min(...values),
        `All six card ${dimension}s agree within 1px, including different rows`,
      ).toBeLessThanOrEqual(1);
    }
    for (const card of await cards.all()) {
      await expect(card.locator("h3")).toHaveCSS("opacity", "1");
      await expect(card.locator("p")).toHaveCSS("opacity", "1");
      expect((await iconGlow(card)).name).toBe("none");
      expect(
        await card.evaluate(
          (element) => element.getAnimations({ subtree: true }).length,
        ),
      ).toBe(0);
    }
  });
}

test("Feature hover is stationary and offscreen motion stops without hiding revealed content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openReady(page);
  const cards = page.locator("#why .grid > .card");
  await expect(cards).toHaveCount(6);

  for (const card of await cards.all()) {
    await page.mouse.move(0, 0);
    await card.evaluate((element) =>
      element.scrollIntoView({ behavior: "instant", block: "center" }),
    );
    await expect(card).toBeInViewport({ ratio: 0.9 });
    await expect(card).toHaveClass(/\bin\b/);
    await expect(card).toHaveClass(/\bmotion-visible\b/);
    await expect
      .poll(() => iconGlow(card))
      .toEqual({
        name: "icon-glow",
        iterations: "infinite",
      });
    await settleFiniteAnimations(card);
    await expect(card.locator("h3")).toHaveCSS("opacity", "1");
    await expect(card.locator("p")).toHaveCSS("opacity", "1");
    const before = await card.boundingBox();
    expect(before).not.toBeNull();
    await card.hover();
    expect(await card.evaluate((element) => element.matches(":hover"))).toBe(
      true,
    );
    await settleFiniteAnimations(card);
    await expect(card).toHaveCSS("transform", "none");
    const after = await card.boundingBox();
    expect(after).not.toBeNull();
    for (const dimension of ["x", "y", "width", "height"]) {
      expect(
        Math.abs(after[dimension] - before[dimension]),
      ).toBeLessThanOrEqual(0.1);
    }
  }

  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  for (const card of await cards.all()) {
    await expect(card).not.toBeInViewport();
    await expect(card).not.toHaveClass(/\bmotion-visible\b/);
    await expect(card).toHaveClass(/\bin\b/);
    // Playwright visibility checks do not require viewport intersection.
    await expect(card).toBeVisible();
    await expect(card).toHaveCSS("opacity", "1");
    for (const selector of [".ic", ".ic svg", "h3", "p"]) {
      await expect(card.locator(selector)).toBeVisible();
      await expect(card.locator(selector)).toHaveCSS("opacity", "1");
      expect(
        await card.locator(selector).evaluate((element) => {
          const transform = getComputedStyle(element).transform;
          return (
            transform === "none" || new DOMMatrixReadOnly(transform).isIdentity
          );
        }),
        "Revealed inner content has no residual movement",
      ).toBe(true);
    }
    await expect(card.locator(".ic path")).toHaveCSS(
      "stroke-dashoffset",
      "0px",
    );
    await expect
      .poll(() => iconGlow(card))
      .toEqual({
        name: "none",
        iterations: "1",
      });
    expect(
      await card.evaluate(
        (element) =>
          element
            .getAnimations({ subtree: true })
            .filter(
              (animation) =>
                animation.effect.getComputedTiming().iterations === Infinity,
            ).length,
      ),
    ).toBe(0);
  }

  const first = cards.first();
  await first.evaluate((element) =>
    element.scrollIntoView({ behavior: "instant", block: "center" }),
  );
  await expect(first).toBeInViewport({ ratio: 0.9 });
  await expect(first).toHaveClass(/\bin\b/);
  await expect(first).toHaveClass(/\bmotion-visible\b/);
  await expect
    .poll(() => iconGlow(first))
    .toEqual({
      name: "icon-glow",
      iterations: "infinite",
    });
});
