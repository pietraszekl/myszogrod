import { expect, test, type Page } from "@playwright/test";

async function mockAnonymousSupabase(page: Page) {
  await page.route("**/*.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname.includes("/auth/v1/user")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ user: null }),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockAnonymousSupabase(page);
});

test("anonymous users do not see project-only actions", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Zaloguj się" })).toBeVisible();
  await expect(
    page.getByText("Zaloguj się, aby zobaczyć i dodawać nieruchomości."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Dodaj nieruchomość" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ustawienia projektu" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Filtry listy" })).toHaveCount(0);
});

test("login panel supports sign in, registration, and password reset without private placeholders", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Zaloguj się" }).click();

  await expect(page.getByRole("heading", { name: "Ustawienia projektu" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Logowanie" })).toBeVisible();
  await expect(page.getByPlaceholder("email@przyklad.pl")).toBeVisible();
  await expect(page.getByPlaceholder("Minimum 6 znaków")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nie pamiętasz hasła?" })).toBeVisible();
  await expect(page.getByText("piver2@gmail.com")).toHaveCount(0);

  await page.getByRole("button", { name: "Nie pamiętasz hasła?" }).click();
  await expect(
    page.getByText("Podaj email, na który wysłać link resetowania hasła."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Rejestracja" }).click();
  await expect(page.getByRole("button", { name: "Utwórz konto" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Google" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "GitHub" })).toHaveCount(0);
});
