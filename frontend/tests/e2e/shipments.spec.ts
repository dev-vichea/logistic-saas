import { test, expect } from "@playwright/test";

test("open Vektor-style create shipment workspace, test document extraction and draft workflow", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(process.env.E2E_EMAIL || "dara@mekong.test");
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_PASSWORD || "MekongDemo2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Navigate to Shipments
  const sidebar = page.getByRole("complementary", { name: "Workspace sidebar" });
  await sidebar.getByRole("link", { name: /Shipments/ }).first().click();
  await expect(page).toHaveURL(/\/freight\/shipments$/);

  // Click Create Shipment button
  await page.getByRole("button", { name: "Create Shipment" }).click();

  // Verify the Create Shipment Workspace opens
  const workspace = page.getByRole("dialog", { name: "Create Operational Shipment" });
  await expect(workspace).toBeVisible();

  // Verify Vektor-style Drafts Top Bar
  await expect(workspace.getByText(/Draft #1/)).toBeVisible();
  await expect(workspace.getByRole("button", { name: "Save Draft" })).toBeVisible();
  await expect(workspace.getByRole("button", { name: "Create Shipment" })).toBeVisible();

  // Verify the 6 Form Cards on Left Panel
  await expect(workspace.getByRole("heading", { name: "Shipment Information" })).toBeVisible();
  await expect(workspace.getByRole("heading", { name: "Commercial Stakeholders" })).toBeVisible();
  await expect(workspace.getByRole("heading", { name: "Pick Up" })).toBeVisible();
  await expect(workspace.getByRole("heading", { name: "Drop Off" })).toBeVisible();
  await expect(workspace.getByRole("heading", { name: "Cargo Information & Line Items" })).toBeVisible();
  await expect(workspace.getByRole("heading", { name: "Transport & Carrier Execution" })).toBeVisible();
  await expect(workspace.getByRole("heading", { name: "Documents & Operational Notes" })).toBeVisible();

  // Test Adding a Second Draft Tab
  await workspace.getByTitle("Add another shipment draft").click();
  await expect(workspace.getByText(/Draft #2/)).toBeVisible();

  // Switch back to Draft #1
  await workspace.getByText(/Draft #1/).click();

  // Test Sample Document Loading in Right Panel
  await workspace.getByRole("button", { name: "Load Sample B/L Document" }).click();
  await expect(workspace.getByText("TRUCK WAY BILL OF LADING")).toBeVisible();
  await expect(workspace.getByText("RCLY261030704").first()).toBeVisible();

  // Test Smart Extraction
  await workspace.getByRole("button", { name: "Extract Data" }).click();
  await expect(workspace.getByText(/97% AI Confidence/)).toBeVisible();
  await expect(workspace.getByRole("button", { name: "Apply to Form" })).toBeVisible();

  // Apply Extracted Data to Form
  await workspace.getByRole("button", { name: "Apply to Form" }).click();
  await expect(workspace.getByLabel("Master B/L / AWB / Tracking #")).toHaveValue("RCLY261030704");

  // Select Customer / Shipper partner
  await workspace.getByRole("combobox", { name: "Customer / Shipper *" }).click();
  await page.getByRole("option").first().click();

  // Test Route Map Tab
  await workspace.getByRole("button", { name: "Route Map" }).click();
  await expect(workspace.getByText("Transit Corridor Map")).toBeVisible();
  await expect(workspace.getByText(/Expressway Corridor/)).toBeVisible();

  // Switch back to Document Preview
  await workspace.getByRole("button", { name: /Document Preview/ }).click();
  await expect(workspace.getByText("TRUCK WAY BILL OF LADING")).toBeVisible();

  // Test Save Draft
  await workspace.getByRole("button", { name: "Save Draft" }).click();

  // Submit and Create Shipment
  await workspace.getByRole("button", { name: "Create Shipment" }).click();

  // Verify workspace closes and returns to shipments or shipment detail
  await expect(workspace).toBeHidden({ timeout: 15000 });
});
