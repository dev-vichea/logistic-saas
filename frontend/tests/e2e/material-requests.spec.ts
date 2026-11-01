import { test, expect } from "@playwright/test";

test("create, edit, and submit a material request from the sidebar", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(process.env.E2E_EMAIL || "dara@mekong.test");
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_PASSWORD || "MekongDemo2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const sidebar = page.getByRole("complementary", { name: "Workspace sidebar" });
  await sidebar.getByRole("link", { name: "Material Requests" }).click();
  await expect(page).toHaveURL(/\/material-requests$/);

  await page.getByRole("button", { name: "New material request" }).first().click();
  const drawer = page.getByRole("dialog", { name: "New material request" });
  const title = `Fabric request ${Date.now()}`;
  await drawer.getByLabel("Request title").fill(title);
  await drawer.getByLabel("Needed by").fill("2026-12-15");
  await drawer.getByLabel("Description").fill("Cotton fabric");
  await drawer.getByLabel("Specification").fill("Blue, 150 cm");
  await drawer.getByLabel("Quantity").fill("10000");
  await drawer.getByLabel("Unit").fill("METER");
  await drawer.getByRole("button", { name: "Add material" }).click();
  await drawer.getByLabel("Description").nth(1).fill("Metal zipper");
  await drawer.getByLabel("Quantity").nth(1).fill("5000");
  await drawer.getByLabel("Unit").nth(1).fill("PCS");
  await drawer.getByRole("button", { name: "Save request" }).click();
  await expect(drawer).toBeHidden();

  const row = page.locator(".ag-row").filter({ hasText: title });
  await expect(row).toBeVisible();
  await row.getByRole("link").click();
  await expect(page).toHaveURL(/\/material-requests\/\d+$/);
  await page.getByRole("tab", { name: "Materials" }).click();
  await expect(page.getByText("Cotton fabric")).toBeVisible();
  await expect(page.getByText("Metal zipper")).toBeVisible();

  await page.getByRole("button", { name: "Edit request" }).click();
  const editDrawer = page.getByRole("dialog", { name: "Edit material request" });
  await editDrawer.getByLabel("Quantity").nth(1).fill("6000");
  await editDrawer.getByRole("button", { name: "Save changes" }).click();
  await expect(editDrawer).toBeHidden();
  await expect(page.getByRole("cell", { name: "6,000" })).toBeVisible();

  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByText("Submitted", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit request" })).toHaveCount(0);
});
