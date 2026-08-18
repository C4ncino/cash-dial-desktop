import { closeTauriDriver, createDriver, deleteDatabase, driver } from "@test/driver";
import { By, until } from "selenium-webdriver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Tauri - Account creation", () => {
  beforeAll(async () => {
    await createDriver();
  });

  afterAll(async () => {
    await closeTauriDriver();
    deleteDatabase();
  });

  it("creates a cash account", async () => {
    // wait app UI
    await driver.wait(until.elementLocated(By.css("body")), 10000);

    // open-form
    const openForm = await driver.findElement(By.id("create-account-button"));
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

    await driver.sleep(200);

    const accountLink = await driver.findElement(By.css('a[href="/account?id=6"]'));
    await accountLink.click();

    await driver.wait(until.elementLocated(By.css("body")), 10000);

    const bodyText = await driver.findElement(By.css("body")).getText();

    expect(bodyText).toContain("Checking Account");
  });
});
