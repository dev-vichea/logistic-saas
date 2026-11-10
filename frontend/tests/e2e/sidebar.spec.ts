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

  // Wait for rate limit budget if shared suite runs
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

test("complete ShipFlow logistics navigation, groups, search and compact rail", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);

  const sidebar = page.getByRole("complementary", {
    name: "Workspace sidebar",
  });

  // 1. WORKSPACE items
  await expect(
    sidebar.getByRole("link", { name: "Dashboard", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await expect(
    sidebar.getByRole("button", { name: "My Tasks" }),
  ).toBeVisible();

  // Test opening My Tasks drawer
  await sidebar.getByRole("button", { name: "My Tasks" }).click();
  await expect(page.getByText("My Operational Tasks")).toBeVisible();
  await page.keyboard.press("Escape");

  // 2. COMMERCIAL items
  await expect(
    sidebar.getByRole("link", { name: "Requests", exact: true }),
  ).toBeVisible();
  await expect(
    sidebar.getByRole("link", { name: "Quotations", exact: true }),
  ).toBeVisible();
  await expect(
    sidebar.getByRole("link", { name: "Service Jobs", exact: true }),
  ).toBeVisible();

  // 3. OPERATIONS groups
  for (const group of [
    "Shipments",
    "Dispatch",
    "Fleet",
    "Customs Clearance",
  ]) {
    await expect(
      sidebar.getByRole("button", { name: new RegExp(`^${group}`) }),
    ).toBeVisible();
  }

  // Check Shipments group
  await expect(
    sidebar.getByRole("link", { name: "All Shipments", exact: true }),
  ).toBeVisible();

  // Check Dispatch group toggle
  const dispatch = sidebar.getByRole("button", { name: "Dispatch", exact: true });
  await dispatch.click();
  await expect(dispatch).toHaveAttribute("aria-expanded", "true");
  await expect(
    sidebar.getByRole("link", { name: "Trips", exact: true }),
  ).toBeVisible();
  for (const [name, href] of [
    ["Dispatch Board", "/transport/dispatch-board"],
    ["Schedule", "/transport/schedule"],
    ["Transport Orders", "/transport/orders"],
    ["Manifests", "/transport/manifests"],
  ]) {
    await expect(sidebar.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  }
  await expect(sidebar.getByRole("button", { name: /^Tenders/ })).toBeDisabled();

  // 4. BUSINESS groups
  for (const group of ["Documents", "Billing", "Network"]) {
    await expect(
      sidebar.getByRole("button", { name: new RegExp(`^${group}`) }),
    ).toBeVisible();
  }

  // 5. SYSTEM group
  const settings = sidebar.getByRole("button", { name: /^Settings/ });
  await settings.click();
  await expect(settings).toHaveAttribute("aria-expanded", "true");
  await expect(
    sidebar.getByRole("link", { name: "Organizations", exact: true }),
  ).toBeVisible();
  await expect(
    sidebar.getByRole("link", { name: "Team & Permissions", exact: true }),
  ).toBeVisible();
  await expect(
    sidebar.getByRole("link", { name: "Audit Logs", exact: true }),
  ).toBeVisible();

  // 6. Navigation Search (Ctrl/Cmd + K)
  await sidebar
    .getByRole("button", { name: "Search navigation", exact: true })
    .click();

  const search = page.getByRole("dialog", {
    name: "Search navigation",
    exact: true,
  });
  await expect(search).toBeVisible();

  await search.getByRole("combobox", { name: "Find a page" }).fill("shipments");
  await search.getByRole("combobox", { name: "Find a page" }).press("Enter");
  await expect(page).toHaveURL(/\/freight\/shipments$/);

  // 7. Compact Sidebar Toggle
  await sidebar
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  await expect(sidebar).toHaveAttribute("data-compact", "true");

  await sidebar
    .getByRole("button", { name: "Expand sidebar", exact: true })
    .click();
  await expect(sidebar).toHaveAttribute("data-compact", "false");

  // 8. User Profile Dropdown
  await sidebar
    .getByRole("button", { name: "Account menu", exact: true })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
});

test("mobile drawer keyboard focus, search and ShipFlow navigation", async ({
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
    .fill("team & permissions");
  await search.getByRole("combobox", { name: "Find a page" }).press("Enter");
  await expect(page).toHaveURL(/\/team$/);
  await expect(drawer).not.toBeVisible();
});
