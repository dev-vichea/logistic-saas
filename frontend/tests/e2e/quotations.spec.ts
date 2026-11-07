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

  // Check rate limit budget
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
}

test("quotation studio split-screen workspace with real-time updating A4 PDF preview", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);

  // Navigate to Quotations
  await page.goto("/freight/quotations");

  // Verify "+ Create Quotation" button exists and opens QuotationStudioWorkspace
  const createBtn = page.getByRole("button", { name: "Create Quotation" });
  await expect(createBtn).toBeVisible();
  await createBtn.click();

  // Verify Split-Screen Quotation Studio opened
  const studio = page.getByRole("dialog", { name: /Quotation Studio/i });
  await expect(studio).toBeVisible();

  // Check that the left side has the builder and right side has the A4 PDF preview
  await expect(page.getByRole("button", { name: /Live A4/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Embed/ })).toBeVisible();
  await expect(page.getByText("SHIPFLOW LOGISTICS (CAMBODIA) CO., LTD.")).toBeVisible();
  await expect(page.getByText("FREIGHT QUOTATION / 报价单")).toBeVisible();

  // Test toggling to Embed Reference PDF viewer mode
  await page.getByRole("button", { name: /Embed/ }).click();
  await expect(page.getByText("Embed Customer Quotation or Reference PDF")).toBeVisible();
  await page.getByRole("button", { name: /Live A4/ }).click();

  // Test Industry Presets
  const sihPresetBtn = page.getByRole("button", { name: /Sihanoukville/i });
  await expect(sihPresetBtn).toBeVisible();
  await sihPresetBtn.click();

  // Verify Sihanoukville line items appear in the live A4 PDF sheet
  const printArea = page.locator("#quotation-print-area");
  await expect(printArea.getByText("Customs Clearance (20'GP/40'HC)")).toBeVisible();
  await expect(printArea.getByText("Trucking Delivery (PAS Sihanoukville -> Factory)")).toBeVisible();
  await expect(printArea.getByText(/Charges As Per Official Receipt/)).toBeVisible();
  await expect(printArea.getByText(/Port LOLO/)).toBeVisible();

  // Test Real-Time Form-to-PDF synchronization: modify a line item description
  const firstDescInput = page.locator('input[placeholder="Charge description"]').first();
  await firstDescInput.fill("Priority Express Clearance Service");

  // Verify the A4 PDF immediately reflected the change in real-time
  await expect(printArea.getByText("Priority Express Clearance Service")).toBeVisible();

  // Test Fullscreen Toggle (switches to full screen and back to drawer)
  const fullscreenBtn = page.getByRole("button", { name: "Fullscreen" });
  await expect(fullscreenBtn).toBeVisible();
  await fullscreenBtn.click();
  await expect(page.getByRole("button", { name: "Exit Fullscreen" })).toBeVisible();
  await page.getByRole("button", { name: "Exit Fullscreen" }).click();
  await expect(page.getByRole("button", { name: "Fullscreen" })).toBeVisible();

  // Test Print button exists
  await expect(page.getByRole("button", { name: "Print / PDF" })).toBeVisible();

  // Close workspace
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(studio).not.toBeVisible();
});

