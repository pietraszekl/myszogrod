import { expect, test, type Page } from "@playwright/test";

async function mockAnonymousSupabase(page: Page) {
  await page.route("**/*.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname.includes("/auth/v1/token")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          expires_in: 3600,
          token_type: "bearer",
          user: {
            id: "test-user-id",
            aud: "authenticated",
            role: "authenticated",
            email: "test@example.com",
          },
        }),
      });
      return;
    }

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

async function mockAuthenticatedSupabase(page: Page) {
  await page.unroute("**/*.supabase.co/**");
  await page.route("**/*.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname.includes("/auth/v1/token")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          expires_in: 3600,
          token_type: "bearer",
          user: {
            id: "test-user-id",
            aud: "authenticated",
            role: "authenticated",
            email: "test@example.com",
          },
        }),
      });
      return;
    }

    if (url.pathname.includes("/auth/v1/user")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-user-id",
            aud: "authenticated",
            role: "authenticated",
            email: "test@example.com",
          },
        }),
      });
      return;
    }

    if (url.pathname.includes("/rest/v1/rpc/create_project")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-project-id",
          name: "Mój projekt",
          owner_id: "test-user-id",
        }),
      });
      return;
    }

    if (url.pathname.includes("/rest/v1/rpc/accept_my_project_invitations")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(0),
      });
      return;
    }

    if (url.pathname.includes("/rest/v1/projects")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "test-project-id",
            name: "Mój projekt",
            owner_id: "test-user-id",
          },
        ]),
      });
      return;
    }

    if (url.pathname.includes("/rest/v1/properties")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([]),
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

test("location permission is requested only after tapping the location button", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const testWindow = window as unknown as Window & {
      __testGeolocationCalls: number;
    };
    testWindow.__testGeolocationCalls = 0;

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(success: PositionCallback) {
          testWindow.__testGeolocationCalls += 1;
          success({
            coords: {
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              latitude: 50.2649,
              longitude: 19.0238,
              speed: null,
            },
            timestamp: Date.now(),
          } as GeolocationPosition);
        },
      },
    });

    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: {
        query: async () => ({
          name: "geolocation",
          onchange: null,
          state: "prompt",
        }),
      },
    });
  });

  await page.goto("/");

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as Window & { __testGeolocationCalls: number })
            .__testGeolocationCalls,
      ),
    )
    .toBe(0);

  await page
    .getByRole("button", { name: "Pokaż moją lokalizację i promień 2 kilometry" })
    .click();

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as Window & { __testGeolocationCalls: number })
            .__testGeolocationCalls,
      ),
    )
    .toBe(1);

  await page
    .getByRole("button", { name: "Pokaż moją lokalizację i promień 2 kilometry" })
    .click();

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as Window & { __testGeolocationCalls: number })
            .__testGeolocationCalls,
      ),
    )
    .toBe(2);
});

test("mobile map filters open from the header button for signed-in users", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAuthenticatedSupabase(page);

  await page.goto("/");
  await page.getByRole("button", { name: "Zaloguj się" }).click();
  await page.getByPlaceholder("email@przyklad.pl").fill("test@example.com");
  await page.getByPlaceholder("Minimum 6 znaków").fill("secret123");
  await page.getByRole("button", { name: "Zaloguj", exact: true }).click();
  await page.getByRole("button", { name: "Zamknij ustawienia" }).click();

  await page.getByRole("button", { name: "Filtry mapy" }).click();

  const mobileHeader = page.locator("header");
  await expect(mobileHeader.getByText("Typ")).toBeVisible();
  await expect(mobileHeader.getByRole("button", { name: "Działki" })).toBeVisible();
  await expect(mobileHeader.getByText("Ocena od")).toBeVisible();
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

test("password recovery link opens the new password form", async ({ page }) => {
  await page.unroute("**/*.supabase.co/**");
  await page.route("**/*.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname.includes("/auth/v1/user")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-user-id",
            aud: "authenticated",
            role: "authenticated",
            email: "test@example.com",
          },
        }),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  await page.goto("/?auth=recovery");

  await expect(page.getByRole("heading", { name: "Ustawienia projektu" })).toBeVisible();
  await expect(page.getByText("Ustaw nowe hasło do konta.")).toBeVisible();
  await expect(page.getByPlaceholder("Minimum 6 znaków")).toBeVisible();
  await expect(page.getByRole("button", { name: "Zapisz nowe hasło" })).toBeVisible();
});
