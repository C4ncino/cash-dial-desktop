import { closeTauriDriver, createDriver, driver, navigateTo } from "@test/driver";
import { By, Key, until } from "selenium-webdriver";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Statistics user flow", () => {
  beforeEach(async () => {
    await createDriver({ freshDatabase: true });
  });

  afterEach(async () => {
    await closeTauriDriver();
  });

  it("loads the statistics dashboard and changes its period controls", async () => {
    await navigateTo("/stats", By.id("statisticsPeriod"));

    const period = await driver.findElement(By.id("statisticsPeriod"));
    await period.click();
    await period.findElement(By.css('option[value="year"]')).click();

    await driver.wait(async () => {
      const loading = await driver.findElements(By.xpath("//*[contains(., 'Cargando estad') ]"));
      return loading.length === 0;
    }, 10000);

    const body = await driver.findElement(By.css("body")).getText();
    expect(body).not.toMatch(/NaN|Infinity/);
    expect(body).not.toMatch(/-0[.,]00/);
    expect(await driver.findElement(By.id("statisticsPeriod")).getAttribute("value")).toBe("year");

    const directPeriod = await driver.findElement(By.id("statisticsPeriodStart"));
    await driver.executeScript(
      "arguments[0].value = '2024'; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));",
      directPeriod,
    );
    await driver.wait(
      until.elementLocated(By.css('time[datetime^="2024-01-01"]')),
      5000,
    );
    expect(await directPeriod.getAttribute("value")).toBe("2024");

    const previous = await driver.findElement(By.css('button[aria-label="Previous period"]'));
    await previous.sendKeys(Key.ENTER);
    await driver.wait(until.elementLocated(By.css('button[aria-label="Next period"]')), 5000);
    expect(await driver.findElement(By.css("body")).getText()).not.toMatch(/NaN|Infinity/);
  });
});
