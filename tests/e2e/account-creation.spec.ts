import {
  clickWhenReady,
  closeTauriDriver,
  createDriver,
  driver,
  findVisible,
  invokeCommand,
  navigateTo,
  waitForHomeReady,
} from "@test/driver";
import { By, until } from "selenium-webdriver";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ACCOUNT_FUNCTIONS } from "@/types/enums";

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

  it("creates a new account after navigating away from an open edit form", async () => {
    const accountsBefore = await invokeCommand<Account[]>(ACCOUNT_FUNCTIONS.get);
    const originalAccount = accountsBefore.find((account) => account.id === 1);
    if (!originalAccount) throw new Error("Seeded account 1 was not found");

    await navigateTo("/account?id=1", By.id("edit-account-button"));
    await clickWhenReady(By.id("edit-account-button"));
    await findVisible(By.id("edit-account-dialog"));

    await clickWhenReady(By.id("back-link"));
    await driver.wait(until.urlMatches(/\/$/), 15_000);
    await findVisible(By.id("speed-dial-toggle"));
    await waitForHomeReady();
    await clickWhenReady(By.id("create-account-button"));
    await findVisible(By.id("create-account-dialog"));

    await driver
      .findElement(By.css('#account-form input[name="name"]'))
      .sendKeys("Post Navigation Account");
    const balance = await driver.findElement(By.css('#account-form input[name="balance"]'));
    await balance.clear();
    await balance.sendKeys("25");
    await clickWhenReady(By.xpath('//form[@id="account-form"]//label[contains(., "Efectivo")]'));
    await clickWhenReady(By.css('#account-form button[type="submit"]'));

    await driver.wait(
      until.elementLocated(
        By.xpath('//a[starts-with(@href, "/account?id=") and contains(., "Post Navigation")]'),
      ),
      10_000,
    );
    const accountsAfter = await invokeCommand<Account[]>(ACCOUNT_FUNCTIONS.get);
    expect(accountsAfter).toHaveLength(accountsBefore.length + 1);
    expect(accountsAfter.find((account) => account.id === 1)?.name).toBe(originalAccount.name);
    expect(accountsAfter.some((account) => account.name === "Post Navigation Account")).toBe(true);
  });
});
