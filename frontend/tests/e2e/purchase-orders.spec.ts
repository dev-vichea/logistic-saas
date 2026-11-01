import { test, expect } from "@playwright/test";

test("create a purchase order from a material request and issue it", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(process.env.E2E_EMAIL || "dara@mekong.test");
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_PASSWORD || "MekongDemo2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const sidebar = page.getByRole("complementary", { name: "Workspace sidebar" });
  await sidebar.getByRole("link", { name: "Material Requests" }).click();
  await page.getByRole("button", { name: "New material request" }).first().click();
  const requestDrawer = page.getByRole("dialog", { name: "New material request" });
  const title = `PO source ${Date.now()}`;
  await requestDrawer.getByLabel("Request title").fill(title);
  await requestDrawer.getByLabel("Description").fill("Cotton fabric");
  await requestDrawer.getByLabel("Quantity").fill("100");
  await requestDrawer.getByLabel("Unit").fill("METER");
  await requestDrawer.getByRole("button", { name: "Save request" }).click();
  await expect(requestDrawer).toBeHidden();

  await page.locator(".ag-row").filter({ hasText: title }).getByRole("link").click();
  await page.getByRole("button", { name: "Submit request" }).click();
  await page.getByRole("button", { name: "New purchase order" }).click();
  const drawer = page.getByRole("dialog", { name: "New purchase order" });
  await drawer.getByRole("combobox", { name: "Supplier" }).click();
  await page.getByRole("option").first().click();
  await drawer.getByLabel("Unit price (USD)").fill("2.50");
  await drawer.getByLabel("Expected delivery date").fill("2026-12-15");
  await drawer.getByRole("button", { name: "Save draft PO" }).click();
  await expect(page).toHaveURL(/\/purchase-orders\/\d+$/);
  await expect(page.getByRole("tablist", { name: "Open records" }).getByRole("tab")).toHaveCount(2);
  await page.getByRole("tab", { name: "Materials" }).click();
  await expect(page.getByText("Cotton fabric")).toBeVisible();
  await expect(page.getByRole("cell", { name: "250.00" })).toBeVisible();

  await page.getByRole("button", { name: "Edit purchase order" }).click();
  const editDrawer = page.getByRole("dialog", { name: "Edit purchase order" });
  await editDrawer.getByLabel("Quantity").fill("80");
  await editDrawer.getByRole("button", { name: "Save changes" }).click();
  await expect(editDrawer).toBeHidden();
  await expect(page.getByRole("cell", { name: "200.00" })).toBeVisible();
  await page.getByRole("button", { name: "Mark as issued" }).click();
  await expect(page.getByText("Issued", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit purchase order" })).toHaveCount(0);

  await page.getByRole("tab", { name: "Overview" }).click();
  await page.getByRole("button", { name: /^Open MR-/ }).first().click();
  await expect(page).toHaveURL(/\/material-requests\/\d+$/);
  await expect(page.getByRole("tablist", { name: "Open records" }).getByRole("tab")).toHaveCount(2);
  await page.getByRole("tablist", { name: "Open records" }).getByRole("tab", { name: /^PO-/ }).click();
  await expect(page).toHaveURL(/\/purchase-orders\/\d+$/);
  await page.getByRole("tab", { name: /Documents/ }).click();
  await page.getByLabel("Choose document").setInputFiles({
    name: "record-preview.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/nGQAAAAASUVORK5CYII=", "base64"),
  });
  await page.getByRole("button", { name: "Upload document" }).click();
  await expect(page.getByText("record-preview.png").first()).toBeVisible();
  await expect(page.getByTitle("Preview record-preview.png")).toBeVisible();
  await expect(page.getByTitle("Preview record-preview.png")).toHaveAttribute("src", /\/documents\/\d+\/content$/);

  await page.getByRole("button", { name: "Close workspace" }).click();
  await expect(page).toHaveURL(/\/material-requests\/\d+$/);
  await page.getByRole("button", { name: "Close workspace" }).click();
  await expect(page).toHaveURL(/\/material-requests$/);

  await sidebar.getByRole("link", { name: "Purchase Orders" }).click();
  await expect(page).toHaveURL(/\/purchase-orders$/);
  await expect(page.getByRole("grid")).toBeVisible();
  await expect(page.getByText("Issued", { exact: true }).first()).toBeVisible();

  await sidebar.getByRole("link", { name: "Material Requests" }).click();
  await page.getByRole("button", { name: "New material request" }).first().click();
  const secondDrawer = page.getByRole("dialog", { name: "New material request" });
  const secondTitle = `List PO source ${Date.now()}`;
  await secondDrawer.getByLabel("Request title").fill(secondTitle);
  await secondDrawer.getByLabel("Description").fill("Metal zipper");
  await secondDrawer.getByLabel("Quantity").fill("20");
  await secondDrawer.getByLabel("Unit").fill("PCS");
  await secondDrawer.getByRole("button", { name: "Save request" }).click();
  await page.locator(".ag-row").filter({ hasText: secondTitle }).getByRole("link").click();
  await page.getByRole("button", { name: "Submit request" }).click();
  await page.getByRole("button", { name: "Close workspace" }).click();
  await expect(page).toHaveURL(/\/material-requests$/);

  await sidebar.getByRole("link", { name: "Purchase Orders" }).click();
  await page.getByRole("button", { name: "New purchase order" }).first().click();
  const listDrawer = page.getByRole("dialog", { name: "New purchase order" });
  await listDrawer.getByPlaceholder("Search submitted requests...").fill(secondTitle);
  await listDrawer.getByRole("combobox", { name: "Material request" }).click();
  await page.getByRole("option", { name: new RegExp(secondTitle) }).click();
  await listDrawer.getByRole("combobox", { name: "Supplier" }).click();
  await page.getByRole("option").first().click();
  await listDrawer.getByLabel("Unit price (USD)").fill("1.25");
  await listDrawer.getByRole("button", { name: "Save draft PO" }).click();
  await expect(page).toHaveURL(/\/purchase-orders\/\d+$/);
  await page.getByRole("tab", { name: "Materials" }).click();
  await expect(page.getByText("Metal zipper")).toBeVisible();
});
