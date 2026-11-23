import { test as base, expect } from "@playwright/test";
import { storyPanels } from "../src/storyDemos.js";

// Observe uncaught errors from before navigation through every interaction.
// WebGL-disabled coverage intentionally permits Three.js's console diagnostic.
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

const storyTitles = storyPanels.map((panel) => panel.title);
const storyCopy = storyPanels.map((panel) => panel.text);
const storyChips = storyPanels.flatMap((panel) => panel.chips || []);
const storyCount = storyPanels.length;
const sectionIds = ["how", "why", "screens", "cta"];
const navigation = [
  ["How it works", "how"],
  ["Why KadaBook", "why"],
  ["Screens", "screens"],
];

async function openSite(page, state = "ready") {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(page.locator(".kadabook-site")).toHaveAttribute(
    "data-scene-state",
    state,
  );
  await expect(page.locator("body")).toHaveClass(
    state === "ready" ? /\bgl3d\b/ : /\bnogl\b/,
  );
}

async function expectNoOverflow(page) {
  // The original 3D content is painted on canvas, not DOM phone mockups.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document.scrollingElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      { message: "The page must not scroll horizontally" },
    )
    .toBeLessThanOrEqual(1);
}

async function expectLiveWebGL(canvas) {
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        for (const type of ["webgl2", "webgl", "experimental-webgl"]) {
          const context = element.getContext(type);
          if (context) {
            return (
              !context.isContextLost() &&
              context.drawingBufferWidth > 0 &&
              context.drawingBufferHeight > 0
            );
          }
        }
        return false;
      }),
    )
    .toBe(true);
}

async function selectStory(page, index) {
  const dot = page
    .locator(".dots")
    .getByRole("button", { name: `Go to section ${index + 1}`, exact: true });
  await dot.click();
  await expect(page.locator(".kadabook-site")).toHaveAttribute(
    "data-scene-index",
    String(index),
  );
  await expect(dot).toHaveClass(/\bon\b/);
  await expect(page.locator(".dots button.on")).toHaveCount(1);
  await expect(page.locator(".kadabook-site")).toHaveAttribute(
    "data-scene-state",
    "ready",
  );
}

async function openGallery(page) {
  const gallery = page.locator("#galc");
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery).toBeInViewport({ ratio: 0.5 });
  // The gallery initializes its selection on its first visible render frame.
  await expect(page.locator(".kadabook-site")).toHaveAttribute(
    "data-gallery-index",
    "-1",
  );
  await expect(page.locator("#gal")).not.toHaveClass(/\bfb\b/);
  await expect(page.locator("#gal .shots")).toBeHidden();
  await expectLiveWebGL(gallery);
  return gallery;
}

async function expectOriginalContent(page) {
  const site = page.locator(".kadabook-site");
  const panels = site.locator("section.p");
  await expect(panels).toHaveCount(storyCount);
  expect(
    await panels.evaluateAll((items) => items.map((p) => p.dataset.i)),
  ).toEqual(storyPanels.map((_, index) => String(index)));
  // These DOM panels supply the WebGL text and remain available as fallback.
  // They are intentionally clipped in gl3d mode, so do not assert visibility.
  await expect(panels.locator("h2")).toHaveText(storyTitles);
  await expect(panels.locator("p:not(.meta)")).toHaveText(storyCopy);
  await expect(panels.locator("li")).toHaveText(storyChips);
  await expect(panels.locator(".row a")).toHaveText([
    "See how it works",
    "Why KadaBook",
  ]);
  await expect(page.locator("canvas")).toHaveCount(2);
  await expect(page.locator("canvas#gl")).toHaveCount(1);
  await expect(page.locator("canvas#galc")).toHaveAttribute("tabindex", "0");
  await expect(page.locator(".dots button")).toHaveCount(storyCount);
  for (let index = 0; index < storyCount; index += 1) {
    await expect(page.locator(".dots button").nth(index)).toHaveAttribute(
      "aria-label",
      `Go to section ${index + 1}`,
    );
  }
  expect(
    await page
      .locator("#after > section")
      .evaluateAll((sections) => sections.map((section) => section.id)),
  ).toEqual(sectionIds);
  await expect(page.locator("#after > section h2")).toHaveText([
    "Up and running in three steps.",
    "Everything a shop needs. Nothing it doesn’t.",
    "A closer look.",
    "Run your shop on KadaBook.",
  ]);
  await expect(page.locator("#how .card")).toHaveCount(3);
  await expect(page.locator("#how .card h3")).toHaveText([
    "Add your products",
    "Record sales and expenses",
    "See profit and who owes you",
  ]);
  await expect(page.locator("#how .card p")).toHaveText([
    "Enter each item with its price and the stock you have.",
    "Use the calculator for a quick sale and log every bill as it comes.",
    "Check reports and the Credit Book whenever you need them.",
  ]);
  await expect(page.locator("#why .card")).toHaveCount(6);
  await expect(page.locator("#why .card h3")).toHaveText([
    "Credit book",
    "Low stock filter",
    "Daily, weekly, monthly reports",
    "Print or share",
    "Kitchen costing",
    "Three languages",
  ]);
  await expect(page.locator("#why .card p")).toHaveText([
    "Know who owes you, and how much. Send a reminder on WhatsApp.",
    "Spot items before they run out.",
    "Sales, expenses and profit for any period.",
    "Print a bill or report, or send it on WhatsApp.",
    "Raw materials, recipe cost and wastage for food businesses.",
    "Use KadaBook in Tamil, English or Sinhala.",
  ]);
  await expect(page.locator("#why .lead")).toHaveText(
    "The notebook, the calculator and the stock register, together in one app.",
  );
  await expect(page.locator("#screens .lead")).toHaveText(
    "Point at a screen, or tap it, to bring it forward.",
  );
  await expect(page.locator("header nav a")).toHaveText([
    "How it works",
    "Why KadaBook",
    "Screens",
    "WhatsApp us",
  ]);
  await expect(page.locator("footer .fb b")).toHaveText("KadaBook");
  await expect(page.locator("footer .fb span")).toHaveText(
    "Digital accounting, simplified for all shops.",
  );
  await expect(page.locator("footer .fl a")).toHaveText([
    "How it works",
    "Why KadaBook",
    "Screens",
    "WhatsApp",
  ]);
  await expect(page.locator("#cta .lead")).toHaveText(
    "Digital accounting, simplified for all shops.",
  );
  await expect(page.locator("#cta .wa")).toHaveText("Get started on WhatsApp");
  await expect(
    page.locator(".hero-layout, .workflow-tabs, .bento-grid"),
  ).toHaveCount(0);
  await expect(page.locator("#screens button")).toHaveCount(0);
  expect(
    await page
      .locator('a[href^="#"]')
      .evaluateAll((links) =>
        links
          .filter(
            (link) => link.hash && !document.getElementById(link.hash.slice(1)),
          )
          .map((link) => link.hash),
      ),
  ).toEqual([]);
}

for (const width of [1440, 768, 390, 320]) {
  test(`Original content, WebGL story and page fit at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await openSite(page);
    await expectOriginalContent(page);
    await expect(page.locator(".kadabook-site")).toHaveAttribute(
      "data-scene-index",
      "0",
    );
    await expect(page.locator("#gl")).toBeVisible();
    await expect(page.locator("#gl")).toHaveCSS("position", "fixed");
    expect(
      await page
        .locator("#story")
        .evaluate((story) => story.offsetHeight / innerHeight),
    ).toBeCloseTo(storyCount, 2);
    await expectLiveWebGL(page.locator("#gl"));
    await expectNoOverflow(page);
    // Every click changes the selection, including returning to the first dot.
    for (const index of [...storyPanels.map((_, i) => i).slice(1), 0]) {
      await selectStory(page, index);
      await expectNoOverflow(page);
    }
    for (const id of sectionIds) {
      const heading = page.locator(`#${id} h2`);
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeInViewport();
      await expectNoOverflow(page);
    }
    await page.locator("footer").scrollIntoViewIfNeeded();
    await expectNoOverflow(page);
    await expect(page.locator(".kadabook-site")).toHaveAttribute(
      "data-scene-state",
      "ready",
    );
  });
}

test("Original desktop header links reach their sections", async ({ page }) => {
  await openSite(page);
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const [name, id] of navigation) {
    const link = nav.getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", `#${id}`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id} h2`)).toBeInViewport();
  }
});

test("Direct section links initialize at their original destinations", async ({
  page,
}) => {
  for (const id of sectionIds) {
    await page.goto(`/#${id}`);
    await expect(page.locator(".kadabook-site")).toHaveAttribute(
      "data-scene-state",
      "ready",
    );
    await expect(page.locator(`#${id} h2`)).toBeInViewport();
  }
});

test("A restored scroll position still completes the first WebGL frame", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const target = document.getElementById("screens");
      if (!target) return;
      observer.disconnect();
      target.scrollIntoView({ behavior: "instant" });
      window.__restoredScroll = true;
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await openSite(page);
  expect(await page.evaluate(() => window.__restoredScroll)).toBe(true);
  await expect(page.locator("#screens h2")).toBeInViewport();
});

test("WebGL context loss restores readable content and survives resize", async ({
  page,
}) => {
  await openSite(page);
  await page.locator("#gl").evaluate((canvas) => {
    const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
    const extension = context.getExtension("WEBGL_lose_context");
    if (!extension) throw new Error("Context-loss extension unavailable");
    extension.loseContext();
  });
  await expect(page.locator(".kadabook-site")).toHaveAttribute(
    "data-scene-state",
    "fallback",
  );
  await expect(page.locator("#gal .shots")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.p[data-i="0"] h2')).toBeVisible();
  await expectNoOverflow(page);
});

test("Original canvas gallery supports hover and keyboard selection", async ({
  page,
}) => {
  await openSite(page);
  const gallery = await openGallery(page);
  const site = page.locator(".kadabook-site");
  await gallery.hover();
  await expect(site).toHaveAttribute("data-gallery-index", "1");
  await page.mouse.move(0, 0);
  await expect(site).toHaveAttribute("data-gallery-index", "-1");
  await gallery.focus();
  for (const [key, index] of [
    ["Home", 0],
    ["ArrowRight", 1],
    ["ArrowRight", 2],
    ["ArrowRight", 0],
    ["ArrowLeft", 2],
    ["ArrowLeft", 1],
    ["End", 2],
    ["Escape", -1],
  ]) {
    await gallery.press(key);
    await expect(site).toHaveAttribute("data-gallery-index", String(index));
    await expect(gallery).toBeFocused();
  }
  await expect(site).toHaveAttribute("data-scene-state", "ready");
});

test.describe("Touch gallery", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("Tapping a screen selects it and tapping again clears it", async ({
    page,
  }) => {
    await openSite(page);
    const gallery = await openGallery(page);
    await gallery.tap();
    await expect(page.locator(".kadabook-site")).toHaveAttribute(
      "data-gallery-index",
      "1",
    );
    await gallery.tap();
    await expect(page.locator(".kadabook-site")).toHaveAttribute(
      "data-gallery-index",
      "-1",
    );
  });
});

for (const width of [1440, 390]) {
  test(`Missing WhatsApp number warns honestly and protects the dialog at ${width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await openSite(page);
    const trigger = page
      .locator("header")
      .getByRole("link", { name: "WhatsApp us" });
    const dialog = page.getByRole("dialog");
    const originalUrl = page.url();
    const originalOverflow = await page
      .locator("body")
      .evaluate((body) => body.style.overflow);
    const pageCount = context.pages().length;
    await expect(trigger).toHaveAttribute("href", "https://wa.me/");
    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("status")).toContainText(
      "WhatsApp contact hasn’t been added yet.",
    );
    await expect(dialog).toContainText(
      "A contact number is needed before enquiries can be sent.",
    );
    await expect(dialog).toContainText("Nothing is sent from this form.");
    await expect(
      dialog.getByRole("button", { name: "Continue on WhatsApp" }),
    ).toBeDisabled();
    await expect(
      dialog.getByRole("link", { name: "Continue on WhatsApp" }),
    ).toHaveCount(0);
    const shop = dialog.getByLabel("Shop type", { exact: true });
    const language = dialog.getByLabel("Preferred language", { exact: true });
    await shop.selectOption("Restaurant");
    await language.selectOption("Tamil");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box.x).toBeGreaterThan(2);
    await page.mouse.click(1, box.y + box.height / 2);
    await expect(dialog).toBeVisible();
    await expect(shop).toHaveValue("Restaurant");
    await expect(language).toHaveValue("Tamil");
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    await dialog.getByRole("button", { name: "Close contact dialog" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(
      await page.locator("body").evaluate((body) => body.style.overflow),
    ).toBe(originalOverflow);
    await trigger.click();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(page).toHaveURL(originalUrl);
    expect(context.pages()).toHaveLength(pageCount);
  });
}

for (const width of [1440, 320]) {
  test(`No-WebGL fallback stays readable with working links at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (["webgl", "webgl2", "experimental-webgl"].includes(type))
          return null;
        return original.call(this, type, ...args);
      };
    });
    await openSite(page, "fallback");
    await expectOriginalContent(page);
    await expect(page.locator("body")).not.toHaveClass(/\bgl3d\b/);
    for (const selector of ["#gl", "#galc", "#story", ".dots"]) {
      await expect(page.locator(selector)).toBeHidden();
    }
    for (let index = 0; index < storyCount; index += 1) {
      const panel = page.locator(`.p[data-i="${index}"]`);
      await panel.locator("h2").scrollIntoViewIfNeeded();
      await expect(panel).toHaveCSS("opacity", "1");
      await expect(panel).toHaveCSS("position", "relative");
      await expect(panel.locator("h2")).toBeInViewport();
      await expect(panel.locator("p:not(.meta)")).toBeVisible();
      await expectNoOverflow(page);
    }
    for (const [name, id] of [
      ["See how it works", "how"],
      ["Why KadaBook", "why"],
    ]) {
      await page
        .locator('.p[data-i="0"]')
        .getByRole("link", { name, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id} h2`)).toBeInViewport();
    }
    for (const [name, id] of navigation) {
      await page
        .locator("footer")
        .getByRole("link", { name, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id} h2`)).toBeInViewport();
    }
    await expect(page.locator("#gal .shots")).toBeVisible();
    await expect(page.locator("#gal .shots img")).toHaveCount(3);
    for (const alt of [
      "Menu screen",
      "New sale screen",
      "Monthly reports screen",
    ]) {
      const image = page
        .locator("#gal .shots")
        .getByAltText(alt, { exact: true });
      await image.scrollIntoViewIfNeeded();
      await expect(image).toBeVisible();
      await expect
        .poll(() =>
          image.evaluate(
            (element) =>
              element.complete &&
              element.naturalWidth > 0 &&
              element.naturalHeight > 0,
          ),
        )
        .toBe(true);
      await expectNoOverflow(page);
    }
    for (const selector of ["header .wa", "#cta .wa", "footer .wa"]) {
      await page.locator(selector).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Continue on WhatsApp" }),
      ).toBeDisabled();
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(dialog).not.toBeVisible();
    }
    await expect(page.locator(".kadabook-site")).toHaveAttribute(
      "data-scene-state",
      "fallback",
    );
    await expectNoOverflow(page);
  });
}

test("Non-reduced-motion scenes initialize and remain ready through navigation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openSite(page);
  expect(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(false);
  for (const index of [1, storyCount - 1, 0]) await selectStory(page, index);
  const gallery = await openGallery(page);
  await gallery.focus();
  await gallery.press("End");
  await expect(page.locator(".kadabook-site")).toHaveAttribute(
    "data-gallery-index",
    "2",
  );
  await gallery.press("Escape");
  await expect(page.locator(".kadabook-site")).toHaveAttribute(
    "data-gallery-index",
    "-1",
  );
  await page.locator("header .brand").click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator(".kadabook-site")).toHaveAttribute(
    "data-scene-index",
    "0",
  );
  await expect(page.locator(".dots button").first()).toHaveClass(/\bon\b/);
  await expectLiveWebGL(page.locator("#gl"));
  await expect(page.locator(".kadabook-site")).toHaveAttribute(
    "data-scene-state",
    "ready",
  );
});

for (const width of [1440, 390, 320]) {
  test(`Polished fonts and reduced-motion card content stay readable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 320 ? 700 : 900 });
    await page.addInitScript(() => {
      const descriptor = Object.getOwnPropertyDescriptor(
        CanvasRenderingContext2D.prototype,
        "font",
      );
      window.__canvasFonts = new Set();
      Object.defineProperty(CanvasRenderingContext2D.prototype, "font", {
        ...descriptor,
        set(value) {
          window.__canvasFonts.add(value);
          descriptor.set.call(this, value);
        },
      });
    });
    await openSite(page);
    await expect(page.locator(".p .story-icon")).toHaveCount(storyCount);
    expect(
      await page.evaluate(() =>
        [...window.__canvasFonts].some((font) => font.includes("Outfit")),
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() => document.fonts.check("700 38px 'Outfit'")),
    ).toBe(true);
    await expect(page.locator("#why h2")).toHaveCSS("font-family", /Outfit/);
    for (const card of await page.locator(".after .card").all()) {
      await card.scrollIntoViewIfNeeded();
      await expect(card.locator("h3")).toHaveCSS("opacity", "1");
      await expect(card.locator("p")).toHaveCSS("opacity", "1");
      await expect(card.locator(".ic path")).toHaveAttribute("pathLength", "1");
      await expect(card.locator(".ic path")).toHaveCSS(
        "stroke-dashoffset",
        "0px",
      );
      expect(
        await card.evaluate((el) => el.getAnimations({ subtree: true }).length),
      ).toBe(0);
    }
    await expectNoOverflow(page);
  });
}

test("Card content enters in stages and hover never moves its box", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openSite(page);
  const card = page.locator("#how .card").first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveClass(/\bin\b/);
  const delays = await card.evaluate((el) =>
    [".ic", "h3", "p"].map((selector) =>
      parseFloat(getComputedStyle(el.querySelector(selector)).animationDelay),
    ),
  );
  expect(delays[0]).toBeLessThan(delays[1]);
  expect(delays[1]).toBeLessThan(delays[2]);
  await expect(card.locator("p")).toHaveCSS("opacity", "1");
  await expect(card.locator(".ic path")).toHaveCSS("stroke-dashoffset", "0px");
  const before = await card.boundingBox();
  await card.hover();
  await expect(card).toHaveCSS("transform", "none");
  const after = await card.boundingBox();
  expect(after.x).toBeCloseTo(before.x, 1);
  expect(after.y).toBeCloseTo(before.y, 1);
  expect(after.width).toBeCloseTo(before.width, 1);
  expect(after.height).toBeCloseTo(before.height, 1);
  for (const item of await page.locator(".after .card").all()) {
    await item.scrollIntoViewIfNeeded();
    await expect(item.locator("p")).toHaveCSS("opacity", "1");
    await expect(item.locator(".ic path")).toHaveCSS(
      "stroke-dashoffset",
      "0px",
    );
  }
  await expectNoOverflow(page);
});

test("Static fallback has no hidden or animated card content even with motion enabled", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (["webgl", "webgl2", "experimental-webgl"].includes(type)) return null;
      return original.call(this, type, ...args);
    };
  });
  await openSite(page, "fallback");
  for (const card of await page.locator(".after .card").all()) {
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator("h3")).toHaveCSS("opacity", "1");
    await expect(card.locator("p")).toHaveCSS("opacity", "1");
    await expect(card.locator(".ic path")).toHaveCSS(
      "stroke-dashoffset",
      "0px",
    );
    expect(
      await card.evaluate((el) => el.getAnimations({ subtree: true }).length),
    ).toBe(0);
  }
  await expect(page.locator(".p .story-icon path")).toHaveCount(storyCount);
});
