import { expect, test } from "playwright/test";

import { enterAuthenticatedApp } from "./helpers";

test("workspace screens fit mobile, tablet, and desktop in both themes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "The responsive matrix runs once to cover all target widths.");
  test.setTimeout(180_000);
  await enterAuthenticatedApp(page);

  const sizes = [[320, 700], [375, 812], [390, 844], [768, 1024], [1280, 900]] as const;
  const routes = [
    ["/", "Spending"],
    ["/insights", "Insights"],
    ["/manage", "Categories & tags"],
    ["/profile", "Profile"],
    ["/settings", "Settings"],
    ["/privacy", "Privacy policy"],
  ] as const;

  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    for (const theme of ["Light", "Dark"] as const) {
      await page.goto("/settings");
      await page.getByRole("button", { name: theme }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme.toLowerCase());
      await expect(page.locator(".min-h-dvh.bg-bg")).toHaveCSS("background-color", theme === "Light" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)");

      for (const [path, heading] of routes) {
        await page.goto(path);
        await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({ timeout: 15000 });
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme.toLowerCase());
        await expect(page.locator(".min-h-dvh.bg-bg")).toHaveCSS("background-color", theme === "Light" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)");
        const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(documentWidth, `${path} at ${width}px in ${theme.toLowerCase()} mode`).toBeLessThanOrEqual(width + 1);

        if (path === "/" || path === "/settings") {
          await page.screenshot({ animations: "disabled", path: testInfo.outputPath(`nola-${width}-${theme.toLowerCase()}-${path === "/" ? "home" : "settings"}.png`) });
        }
        if (path === "/" && width < 1024) {
          const dock = page.locator(".workspace-dock");
          await expect(dock).toHaveCSS("position", "fixed");
          await expect(dock).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
          const dockBottom = await dock.evaluate((element) => element.getBoundingClientRect().bottom);
          const navigationTop = await page.locator(".mobile-nav").evaluate((element) => element.getBoundingClientRect().top);
          expect(dockBottom).toBeLessThanOrEqual(navigationTop);
          if (width <= 360) await expect(page.locator(".workspace-compose-button")).toBeVisible();
          await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Search", exact: true })).toHaveCount(0);
          if (width <= 639) await expect(page.getByRole("region", { name: "Savings goals" })).toBeVisible();
        }
      }

      await page.goto("/add-expense");
      const expenseSheet = page.getByRole("dialog", { name: "Add expense" });
      await expect(expenseSheet).toBeVisible();
      await expect(page.locator(".app-shell").locator("xpath=..")).toHaveAttribute("inert", "");
      await expect(page.locator(".expense-sheet")).toHaveCSS("opacity", "1");
      const sheetWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(sheetWidth, `Expense sheet at ${width}px in ${theme.toLowerCase()} mode`).toBeLessThanOrEqual(width + 1);
      await page.screenshot({ animations: "disabled", path: testInfo.outputPath(`nola-${width}-${theme.toLowerCase()}-expense.png`) });
    }
  }
});
