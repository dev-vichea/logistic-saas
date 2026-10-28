import { test, expect, type Page } from "@playwright/test";
test.use({ actionTimeout: 15000 });
async function login(page: Page) {
  await page.goto("/login");
  await page
    .getByLabel("Work email")
    .fill(process.env.E2E_EMAIL || "dara@mekong.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.E2E_PASSWORD || "MekongDemo2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  // The full suite shares the demo user. Reserve a real request window for
  // navigation checks rather than changing or bypassing API throttling.
  for (let attempt = 0; attempt < 3; attempt++) {
    const budget = await page.request.get("/api/v1/me", {
      headers: {
        Accept: "application/json",
        Origin: new URL(page.url()).origin,
      },
    });
    if (budget.status() === 429) {
      const seconds = Number(budget.headers()["retry-after"] || "1");
      expect(seconds).toBeLessThanOrEqual(60);
      await page.waitForTimeout((seconds + 1) * 1000);
      continue;
    }
    expect(budget.status()).toBe(200);
    if (Number(budget.headers()["x-ratelimit-remaining"] || "120") < 50)
      await page.waitForTimeout(61_000);
    break;
  }
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Welcome back/ }),
  ).toBeVisible();
}
test("complete navigation, planned groups, search, permissions and compact rail", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);
  const sidebar = page.getByRole("complementary", {
    name: "Workspace sidebar",
  });
  await expect(
    sidebar.getByRole("link", { name: "Overview", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  for (const group of [
    "Freight Management",
    "Transportation",
    "Warehousing",
    "Trade & Documents",
    "Business Network",
    "Finance",
    "Reports",
    "Settings",
  ])
    await expect(
      sidebar.getByRole("button", { name: new RegExp(`^${group}`) }),
    ).toBeVisible();
  const freight = sidebar.getByRole("button", { name: /^Freight Management/ });
  await freight.click();
  await expect(freight).toHaveAttribute("aria-expanded", "true");
  await expect(
    sidebar.getByRole("link", { name: "Shipments", exact: true }),
  ).toBeVisible();
  await expect(
    sidebar.getByRole("link", { name: "Orders & bookings", exact: true }),
  ).toBeVisible();
  await freight.click();
  const transport = sidebar.getByRole("button", { name: /^Transportation/ });
  await transport.click();
  await expect(transport).toHaveAttribute("aria-expanded", "true");
  await expect(
    sidebar.getByRole("button", { name: /^Planning & dispatch/ }),
  ).toBeDisabled();
  await expect(
    sidebar.getByRole("button", { name: /^Fleet & drivers/ }),
  ).toBeDisabled();
  await transport.click();
  await sidebar
    .getByRole("button", { name: "Search navigation", exact: true })
    .click();
  const search = page.getByRole("dialog", {
    name: "Search navigation",
    exact: true,
  });
  await search.getByRole("combobox", { name: "Find a page" }).fill("dispatch");
  await expect(
    search.getByRole("option", { name: /^Planning & dispatch/ }),
  ).toBeDisabled();
  await expect(page).toHaveURL(/\/dashboard$/);
  await search
    .getByRole("combobox", { name: "Find a page" })
    .fill("business partners");
  await search.getByRole("combobox", { name: "Find a page" }).press("Enter");
  await expect(page).toHaveURL(/\/partners$/);
  await expect(
    sidebar.getByRole("link", { name: "Business partners", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Control+k");
  await expect(search).toBeVisible();
  await search
    .getByRole("combobox", { name: "Find a page" })
    .fill("roles & permissions");
  await search.getByRole("combobox", { name: "Find a page" }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "Roles & permissions", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: /owner/i }),
  ).toBeVisible();
  await sidebar
    .getByRole("link", { name: "Contacts & locations", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Contacts & locations", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search partners").fill("does-not-exist-sidebar-check");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/network\/contacts-locations\?q=/);
  await expect(
    page.getByText("No partners found", { exact: true }),
  ).toBeVisible();
  await sidebar
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  await expect(sidebar).toHaveAttribute("data-compact", "true");
  await sidebar
    .getByRole("button", { name: "Business Network", exact: true })
    .click();
  await page.getByRole("menuitem", { name: /Business partners/ }).click();
  await expect(page).toHaveURL(/\/partners$/);
  await page.reload();
  await expect(sidebar).toHaveAttribute("data-compact", "true");
  await sidebar
    .getByRole("button", { name: "Expand sidebar", exact: true })
    .click();
  await expect(sidebar).toHaveAttribute("data-compact", "false");
  await sidebar
    .getByRole("button", { name: "Account menu", exact: true })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await sidebar.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Welcome back/ }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/sidebar-desktop.png" });
});
test("mobile drawer keyboard focus, scrolling, search and navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const trigger = page.locator("#workspace-menu-toggle");
  await trigger.click();
  const drawer = page.getByRole("dialog", {
    name: "Workspace navigation",
    exact: true,
  });
  await expect(drawer).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await drawer.getByRole("button", { name: /^Trade & Documents/ }).click();
  await expect(
    drawer.getByRole("button", { name: /^CDC reconciliation/ }),
  ).toBeDisabled();
  await drawer
    .getByRole("button", { name: "Search navigation", exact: true })
    .click();
  const search = page.getByRole("dialog", {
    name: "Search navigation",
    exact: true,
  });
  await expect(
    search.getByRole("combobox", { name: "Find a page" }),
  ).toBeFocused();
  await search
    .getByRole("combobox", { name: "Find a page" })
    .fill("departments");
  await search.getByRole("combobox", { name: "Find a page" }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "Departments", exact: true }),
  ).toBeVisible();
  await expect(drawer).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await trigger.click();
  await drawer
    .getByRole("link", { name: "Organization profile", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Company profile", exact: true }),
  ).toBeVisible();
  await expect(drawer).not.toBeVisible();
  await trigger.click();
  await page.screenshot({
    path: "test-results/sidebar-mobile.png",
    animations: "disabled",
  });
});
