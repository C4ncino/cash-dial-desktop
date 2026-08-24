import { closeTauriDriver, createDriver, driver, waitForHomeReady } from "@test/driver";
import { By, until } from "selenium-webdriver";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Tauri - Account creation", () => {
  beforeEach(async () => {
    await createDriver({ freshDatabase: true });
    await waitForHomeReady();
  });

  afterEach(async () => {
    await closeTauriDriver();
  });

  it("creates a cash account", async () => {
    // wait app UI
    // open-form
    const openForm = await driver.wait(until.elementLocated(By.id("create-account-button")), 15000);
    await openForm.click();

    // fill form
    const name = await driver.findElement(By.css('input[name="name"]'));
    await name.sendKeys("Checking Account");

    const balance = await driver.findElement(By.css('input[name="balance"]'));
    await balance.sendKeys("1000");

    // select type
    const cashType = await driver.findElement(By.xpath("//label[contains(., 'Efectivo')]"));
    await cashType.click();

    // submit
    const submit = await driver.findElement(By.css('button[type="submit"]'));

    await submit.click();

    const accountCard = await driver.wait(
      until.elementLocated(
        By.xpath('//a[starts-with(@href, "/account?id=") and .//h3[contains(., "Checking")]]'),
      ),
      10000,
    );
    await driver.executeScript(
      "arguments[0].scrollIntoView({ block: 'center' }); arguments[0].click();",
      accountCard,
    );

    const accountIsVisible = await driver.wait(async () => {
      try {
        const bodyText = await driver.findElement(By.css("body")).getText();
        return bodyText.includes("Checking Account");
      } catch {
        return false;
      }
    }, 10000);

    expect(accountIsVisible).toBe(true);
  });
});
