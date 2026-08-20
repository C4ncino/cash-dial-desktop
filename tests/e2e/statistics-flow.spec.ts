import { closeTauriDriver, createDriver, driver } from "@test/driver";
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
    await driver.get("http://tauri.localhost/stats");
    await driver.wait(until.elementLocated(By.id("statisticsPeriod")), 15000);

    const period = await driver.findElement(By.id("statisticsPeriod"));
    await period.click();
    await period.findElement(By.css('option[value="year"]')).click();

    await driver.wait(async () => {
      const loading = await driver.findElements(By.xpath("//*[contains(., 'Cargando estad') ]"));
      return loading.length === 0;
    }, 10000);

    const body = await driver.findElement(By.css("body")).getText();
    expect(body).not.toMatch(/NaN|Infinity/);
    expect(await driver.findElement(By.id("statisticsPeriod")).getAttribute("value")).toBe("year");

    const previous = await driver.findElement(By.css('button[aria-label="Previous period"]'));
    await previous.sendKeys(Key.ENTER);
    await driver.wait(until.elementLocated(By.css('button[aria-label="Next period"]')), 5000);
    expect(await driver.findElement(By.css("body")).getText()).not.toMatch(/NaN|Infinity/);
  });
});
