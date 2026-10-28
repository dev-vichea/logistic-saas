import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
const demoEmail = process.env.E2E_EMAIL || "dara@mekong.test";
const demoPassword = process.env.E2E_PASSWORD || "MekongDemo2026!";
async function login(page: Page, email = demoEmail, password = demoPassword) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: /Welcome back/ }),
  ).toBeVisible();
}
async function emailLink(
  request: APIRequestContext,
  email: string,
  path: string,
  previousLink?: string,
) {
  const mailpit = process.env.MAILPIT_URL!;
  let result = "";
  await expect
    .poll(
      async () => {
        const response = await request.get(
          `${mailpit}/api/v1/messages?limit=100`,
        );
        const inbox = await response.json();
        for (const message of inbox.messages || []) {
          if (
            !message.To?.some((to: { Address: string }) => to.Address === email)
          )
            continue;
          const full = await (
            await request.get(`${mailpit}/api/v1/message/${message.ID}`)
          ).json();
          const match = String(full.HTML).match(
            new RegExp('href="(https?://[^" ]*' + path + '[^" ]*)"'),
          );
          if (match) {
            result = match[1].replaceAll("&amp;", "&");
            if (result !== previousLink) return true;
          }
        }
        return false;
      },
      { timeout: 30_000, message: `Waiting for ${path} email` },
    )
    .toBe(true);
  return result;
}
async function register(page: Page, email: string, name: string) {
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Work email").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("StrongPassword2026!");
  await page.getByLabel("Confirm password").fill("StrongPassword2026!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check your inbox" }),
  ).toBeVisible();
}
test("cookie login, organization switching, mobile navigation and logout", async ({
  page,
  context,
}) => {
  await login(page);
  await page
    .getByLabel("Switch organization")
    .selectOption({ label: "Angkor Express" });
  await expect(
    page.getByText("Here’s what’s happening at Angkor Express."),
  ).toBeVisible();
  await page
    .getByLabel("Switch organization")
    .selectOption({ label: "Mekong Freight Co." });
  await expect(
    page.getByText("Here’s what’s happening at Mekong Freight Co."),
  ).toBeVisible();
  const cookies = await context.cookies();
  expect(cookies.some((c) => c.name.includes("session") && c.httpOnly)).toBe(
    true,
  );
  // API client sends cookies but neither a fetch-metadata origin assertion nor a CSRF header.
  const rejected = await context.request.post(
    "/api/v1/organizations/1/switch",
    {
      headers: { Origin: "http://localhost:3000", Accept: "application/json" },
    },
  );
  expect(rejected.status()).toBe(419);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Team members", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Team members", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-team.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  const me = await context.request.get("/api/v1/me", {
    headers: { Origin: "http://localhost:3000", Accept: "application/json" },
  });
  expect(me.status()).toBe(401);
});
test("registration, verified onboarding, invitations, RBAC, departments, audit and password reset", async ({
  page,
  browser,
  request,
}) => {
  test.skip(
    !process.env.MAILPIT_URL,
    "Set MAILPIT_URL and run the mail queue to test real email delivery.",
  );
  const unique = Date.now();
  const ownerEmail = `owner-${unique}@example.com`;
  const teammateEmail = `teammate-${unique}@example.com`;
  const company = `Sok Logistics ${unique}`;
  await page.goto("/register");
  await register(page, ownerEmail, "Sok Dara");
  await page.goto(await emailLink(request, ownerEmail, "/verify-email"));
  await page.getByRole("button", { name: "Verify email & continue" }).click();
  await expect(page.getByText("Make room for your business")).toBeVisible();
  await page
    .getByRole("link", { name: "Create organization", exact: true })
    .click();
  await page.getByLabel("Organization name").fill(company);
  await page.getByLabel("Legal company name").fill(company + " Ltd.");
  await page.getByLabel("Company email").fill(ownerEmail);
  await page.getByLabel("Business address").fill("Street 2004, Phnom Penh");
  await page
    .getByRole("button", { name: "Create organization", exact: true })
    .click();
  await expect(
    page.getByText(`Here’s what’s happening at ${company}.`),
  ).toBeVisible();
  await page.getByRole("link", { name: "Departments", exact: true }).click();
  await page
    .getByRole("button", { name: "Add department", exact: true })
    .first()
    .click();
  await page.getByLabel("Department name").fill("Operations");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Cambodia road transport team");
  await page
    .getByRole("button", { name: "Create department", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Operations", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit Operations" }).click();
  await page
    .getByLabel("Description", { exact: true })
    .fill("Regional operations team");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Regional operations team")).toBeVisible();
  await page.getByRole("link", { name: "Team members", exact: true }).click();
  await page
    .getByRole("button", { name: "Invite member", exact: true })
    .click();
  await page.getByLabel("Email address").fill(teammateEmail);
  await page.getByLabel("Role", { exact: true }).selectOption("manager");
  await page
    .getByLabel("Department", { exact: true })
    .selectOption({ label: "Operations" });
  await page
    .getByRole("button", { name: "Send invitation", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: /Invitations/ }).click();
  await expect(page.getByText(teammateEmail, { exact: true })).toBeVisible();
  const previousInvitation = await emailLink(
    request,
    teammateEmail,
    "/invitations/accept",
  );
  await page
    .getByRole("row")
    .filter({ hasText: teammateEmail })
    .getByRole("button", { name: "Resend", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Invitation resent");
  const invitation = await emailLink(
    request,
    teammateEmail,
    "/invitations/accept",
    previousInvitation,
  );
  const teammateContext = await browser.newContext();
  const teammate = await teammateContext.newPage();
  await teammate.goto(invitation);
  await teammate
    .getByRole("link", { name: "Create an account", exact: true })
    .click();
  await register(teammate, teammateEmail, "Chan Sophea");
  await teammate.goto(await emailLink(request, teammateEmail, "/verify-email"));
  await teammate
    .getByRole("button", { name: "Verify email & continue" })
    .click();
  await expect(
    teammate.getByRole("button", { name: "Accept invitation" }),
  ).toBeVisible();
  await teammate.getByRole("button", { name: "Accept invitation" }).click();
  await expect(teammate).toHaveURL(/\/dashboard$/);
  await expect(
    teammate.getByRole("link", { name: "Activity log", exact: true }),
  ).toHaveCount(0);
  await teammate
    .getByRole("link", { name: "Departments", exact: true })
    .click();
  await expect(
    teammate.getByRole("button", { name: "Add department" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Members/ }).click();
  await page.reload();
  await page.getByRole("button", { name: "Edit Chan Sophea" }).click();
  await page.getByLabel("Role", { exact: true }).selectOption("viewer");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await teammate.reload();
  await expect(
    teammate.getByRole("heading", { name: "Departments", exact: true }),
  ).toBeVisible();
  await expect(
    teammate.getByRole("button", { name: "Add department" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Activity log", exact: true }).click();
  await expect(page.getByText("member updated", { exact: true })).toBeVisible();
  await expect(
    page.getByText("invitation accepted", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Organizations", exact: true }).click();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("City / province").fill("Siem Reap");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Company profile updated",
  );
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.getByLabel("Work email").fill(ownerEmail);
  await page
    .getByRole("button", { name: "Send reset link", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("If an account exists");
  await page.goto(await emailLink(request, ownerEmail, "/reset-password"));
  await page
    .getByLabel("Password", { exact: true })
    .fill("ChangedPassword2026!");
  await page.getByLabel("Confirm password").fill("ChangedPassword2026!");
  await page
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Password updated");
  await login(page, ownerEmail, "ChangedPassword2026!");
  await page.getByRole("link", { name: "Departments", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete Operations" }).click();
  await expect(page.getByText("A place for every team")).toBeVisible();
  await teammate
    .getByRole("link", { name: "Business partners", exact: true })
    .click();
  await expect(
    teammate.getByRole("heading", { name: "Business partners", exact: true }),
  ).toBeVisible();
  await expect(
    teammate.getByRole("link", { name: "Add partner", exact: true }),
  ).toHaveCount(0);
  await teammateContext.close();
});
