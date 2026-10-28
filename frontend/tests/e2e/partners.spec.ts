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
  const switcher = page.getByLabel("Switch organization");
  if (
    (await switcher.locator("option:checked").innerText()) !==
    "Mekong Freight Co."
  ) {
    await switcher.selectOption({ label: "Mekong Freight Co." });
    await expect(switcher).toBeEnabled();
  }
  await expect(
    page.getByText("Here’s what’s happening at Mekong Freight Co."),
  ).toBeVisible();
}
async function api(page: Page, path: string, method = "GET", data?: unknown) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await page.evaluate(
      async ({ path, method, data }) => {
        const token =
          document.cookie
            .split("; ")
            .find((c) => c.startsWith("XSRF-TOKEN="))
            ?.split("=")
            .slice(1)
            .join("=") || "";
        const response = await fetch(path, {
          method,
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": decodeURIComponent(token),
          },
          body: data ? JSON.stringify(data) : undefined,
        });
        return {
          status: response.status,
          retryAfter: Number(response.headers.get("Retry-After") || "1"),
          body: response.status === 204 ? null : await response.json(),
        };
      },
      { path, method, data },
    );
    if (result.status !== 429) return result;
    if (result.retryAfter > 60)
      throw new Error(
        "The demo account's hourly quota is exhausted. Run browser tests in a fresh development instance.",
      );
    // Fixture traffic honors the application's existing rate limits.
    await page.waitForTimeout((result.retryAfter + 1) * 1000);
  }
  throw new Error("API rate limit did not reset after Retry-After.");
}
async function isolatedDirectory(page: Page, name: string) {
  const created = await api(page, "/api/v1/organizations", "POST", {
    name,
    country_code: "KH",
    currency: "USD",
    timezone: "Asia/Phnom_Penh",
    activities: ["road_transport"],
  });
  expect(created.status).toBe(201);
  await page.goto("/dashboard");
  await expect(
    page.getByText(`Here’s what’s happening at ${name}.`),
  ).toBeVisible();
  return created.body.data.id;
}
test("partner profiles, multiple contacts and locations, archive/restore and private directories", async ({
  page,
}) => {
  await login(page);
  const suffix = Date.now();
  const name = `Angkor Trading ${suffix}`;
  await isolatedDirectory(page, `Partner browser test ${suffix}`);
  await page
    .getByRole("link", { name: "Business partners", exact: true })
    .click();
  await page.getByRole("link", { name: "Add partner", exact: true }).click();
  await page.getByLabel(/^Company name/).fill(name);
  await page.getByLabel("Legal company name").fill(name + " Ltd.");
  await page.getByLabel("Reference code").fill(`kh-${suffix}`);
  await page.getByLabel("Tax identifier").fill("VAT-1234");
  await page.getByLabel("Company email").fill("operations@example.com");
  await page
    .getByLabel("Operational notes")
    .fill("Private pickup instructions. Call before arrival.");
  await page.getByLabel("Carrier", { exact: true }).check();
  await page.getByLabel("Shipper", { exact: true }).check();
  await page
    .getByRole("button", { name: "Create partner", exact: true })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  const partnerId = page.url().split("/").pop()!;
  const me = await api(page, "/api/v1/me");
  const orgId = me.body.data.organization_id;
  const base = `/api/v1/organizations/${orgId}/partners/${partnerId}`;
  await expect(page.getByText("VAT-1234", { exact: true })).toBeVisible();
  const contacts = page.locator("#contacts");
  const locations = page.locator("#locations");
  for (const [contactName, email] of [
    ["Sophea Chan", "sophea@example.com"],
    ["Dara Lim", "dara@example.com"],
  ]) {
    await contacts
      .getByRole("button", { name: "Add contact", exact: true })
      .click();
    await page.getByLabel("Contact name").fill(contactName);
    await page.getByLabel("Contact email").fill(email);
    await page.getByLabel("Set as primary contact").check();
    await page
      .getByRole("button", { name: "Save contact", exact: true })
      .click();
    await expect(
      contacts.getByRole("heading", { name: contactName, exact: true }),
    ).toBeVisible();
  }
  await contacts.getByRole("button", { name: "Edit Sophea Chan" }).click();
  await expect(page.getByLabel("Set as primary contact")).not.toBeChecked();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await contacts.getByRole("button", { name: "Edit Dara Lim" }).click();
  await page.getByLabel("Job title").fill("Operations lead");
  await page.getByRole("button", { name: "Save contact", exact: true }).click();
  await expect(
    contacts.getByText("Operations lead", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await contacts.getByRole("button", { name: "Delete Sophea Chan" }).click();
  await expect(
    contacts.getByRole("heading", { name: "Sophea Chan", exact: true }),
  ).toHaveCount(0);
  await locations
    .getByRole("button", { name: "Add location", exact: true })
    .click();
  await page.getByLabel("Location name").fill("Phnom Penh warehouse");
  await page.getByLabel("Location type").selectOption("warehouse");
  await page.getByLabel("Address line 1").fill("Street 2004, Sen Sok");
  await page.getByLabel("City").fill("Phnom Penh");
  await page.getByLabel("Latitude").fill("11.5564");
  await page
    .getByRole("button", { name: "Save location", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "both latitude and longitude",
  );
  await page.getByLabel("Longitude").fill("104.9282");
  await page.getByLabel("Set as primary location").check();
  await page
    .getByRole("button", { name: "Save location", exact: true })
    .click();
  await expect(
    locations.getByRole("heading", {
      name: "Phnom Penh warehouse",
      exact: true,
    }),
  ).toBeVisible();
  await locations
    .getByRole("button", { name: "Add location", exact: true })
    .click();
  await page.getByLabel("Location name").fill("Singapore office");
  await page.getByLabel("Address line 1").fill("10 Example Road");
  await page.getByLabel("City").fill("Singapore");
  await page.getByLabel("Country").selectOption("SG");
  await page.getByLabel("Set as primary location").check();
  await page
    .getByRole("button", { name: "Save location", exact: true })
    .click();
  await expect(
    locations.getByRole("heading", { name: "Singapore office", exact: true }),
  ).toBeVisible();
  await locations
    .getByRole("button", { name: "Edit Phnom Penh warehouse" })
    .click();
  await expect(page.getByLabel("Set as primary location")).not.toBeChecked();
  await page.getByLabel("Address line 2").fill("Gate B");
  await page
    .getByRole("button", { name: "Save location", exact: true })
    .click();
  await expect(locations.getByText("Gate B", { exact: false })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await locations
    .getByRole("button", { name: "Delete Singapore office" })
    .click();
  await expect(
    locations.getByRole("heading", { name: "Singapore office", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Edit partner", exact: true }).click();
  await page.getByLabel("Company phone").fill("+855 12 123456");
  await page.getByRole("button", { name: "Save partner", exact: true }).click();
  await expect(page.getByText("+855 12 123456", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/partner-profile.png",
    fullPage: true,
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Archive partner", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Restore partner", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Edit partner", exact: true }),
  ).toHaveCount(0);
  await expect(
    contacts.getByRole("button", { name: "Add contact", exact: true }),
  ).toHaveCount(0);
  expect((await api(page, base, "PATCH", { name: "Blocked" })).status).toBe(
    409,
  );
  await page
    .getByRole("link", { name: "All business partners", exact: true })
    .click();
  await page.getByLabel("Search partners").fill(name);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByText("No partners found", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Status", { exact: true }).selectOption("archived");
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  await page.getByLabel("Business role").selectOption("carrier");
  await page.getByLabel("Country").selectOption("KH");
  await page.getByLabel("Sort by").selectOption("updated_at");
  await page.getByLabel("Sort direction").selectOption("desc");
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Search partners")).toHaveValue(name);
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
    "archived",
  );
  await page.getByRole("link", { name, exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Restore partner", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Edit partner", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Switch organization")
    .selectOption({ label: "Angkor Express" });
  await expect(page).toHaveURL(/\/dashboard$/);
  await page
    .getByRole("link", { name: "Business partners", exact: true })
    .click();
  await page.getByLabel("Search partners").fill(name);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByText("No partners found", { exact: true }),
  ).toBeVisible();
  const other = await api(page, "/api/v1/me");
  expect(
    (
      await api(
        page,
        `/api/v1/organizations/${other.body.data.organization_id}/partners/${partnerId}`,
      )
    ).status,
  ).toBe(404);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("partner directory paginates and sorts real PostgreSQL records", async ({
  page,
}) => {
  await login(page);
  const unique = `Pagination-${Date.now()}`;
  await isolatedDirectory(page, `Directory pagination test ${Date.now()}`);
  const me = await api(page, "/api/v1/me");
  const root = `/api/v1/organizations/${me.body.data.organization_id}/partners`;
  for (let i = 1; i <= 21; i++) {
    const created = await api(page, root, "POST", {
      name: `${unique}-${String(i).padStart(2, "0")}`,
      roles: ["supplier"],
      country_code: "VN",
    });
    expect(created.status).toBe(201);
  }
  let retryAfter: Promise<string | null> | undefined;
  page.on("response", (response) => {
    if (response.status() === 429)
      retryAfter = response.headerValue("Retry-After");
  });
  await page.goto(
    `/partners?q=${unique}&role=supplier&country_code=VN&sort=name&direction=asc&per_page=20`,
  );
  const ready = page.getByText("21 partners in this view", { exact: true });
  const limited = page.getByRole("alert").filter({ hasText: "Too Many" });
  await expect(ready.or(limited).first()).toBeVisible();
  if (await limited.first().isVisible()) {
    // Page bootstrap also consumes API requests; honor its server-provided reset time.
    const seconds = Number((await retryAfter) || "1");
    expect(seconds).toBeLessThanOrEqual(60);
    await page.waitForTimeout((seconds + 1) * 1000);
    await page.reload();
  }
  await expect(ready).toBeVisible();
  await expect(
    page.getByRole("link", { name: `${unique}-01`, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("link", { name: `${unique}-21`, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: `${unique}-01`, exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Sort direction").selectOption("desc");
  await expect(
    page.getByRole("link", { name: `${unique}-21`, exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Page 1 of 2", { exact: true })).toBeVisible();
});
