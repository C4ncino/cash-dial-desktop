import {
  closeTauriDriver,
  createDriver,
  driver,
  findVisible,
  waitForBodyText,
  waitForHomeReady,
} from "@test/driver";
import { By, Key, until } from "selenium-webdriver";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Tauri - Budget creation", () => {
  beforeEach(async () => {
    await createDriver({ freshDatabase: true });
    await waitForHomeReady();
  });

  afterEach(async () => {
    await closeTauriDriver();
  });

  async function clearAndType(element: any, text: string) {
    await element.sendKeys(Key.chord(Key.CONTROL, "a"));
    await element.sendKeys(Key.BACK_SPACE);
    await element.sendKeys(text);
  }

  it("creates a monthly budget", async () => {
    // Wait for application UI to be ready
    // Open create budget form
    const openForm = await findVisible(By.id("create-budget-button"));
    await openForm.click();

    // Wait for form to load
    await findVisible(By.id("budget-form"));

    // Fill Name
    const nameInput = await driver.findElement(By.css('#budget-form input[name="name"]'));
    await nameInput.sendKeys("E2E Monthly Food Budget");

    // Select Category (Comida y bebida -> Supermercados)
    const catBtn = await findVisible(By.css("#budget-form fieldset.relative > button"));
    await catBtn.click();

    // Wait and click Comida y bebida parent category to expand it
    const parentCat = await findVisible(
      By.xpath('//form[@id="budget-form"]//button[contains(., "Comida y Bebida")]'),
    );

    await parentCat.click();

    // Click Supermercados child category to select it
    const childCat = await findVisible(
      By.xpath('//form[@id="budget-form"]//button[contains(., "Supermercados")]'),
    );
    await childCat.click();

    // Select Period Type: select option "Mensual"
    const monthlyType = await driver.findElement(By.xpath("//label[contains(., 'Mensual')]"));
    await monthlyType.click();

    // Fill Limit Amount
    const amountLimitInput = await driver.findElement(By.id("amountLimit"));
    await clearAndType(amountLimitInput, "450.00");

    // Select Currency: select option containing "MXN"
    const currencySelect = await driver.findElement(By.css('#budget-form select[name="currency"]'));
    await currencySelect.click();

    const currencyOption = await currencySelect.findElement(
      By.xpath('./option[contains(., "MXN")]'),
    );
    await currencyOption.click();

    // Submit form
    const submitBtn = await driver.findElement(By.css('#budget-form button[type="submit"]'));
    await submitBtn.click();

    // Verify it renders on the page
    const budgetCard = await driver.wait(
      until.elementLocated(
        By.xpath('//a[contains(@aria-label, "Abrir presupuesto E2E Monthly Food Budget")]'),
      ),
      10000,
    );
    expect(budgetCard).toBeDefined();

    // Verify card content
    await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", budgetCard);
    const cardText = (await budgetCard.getAttribute("textContent")) ?? "";
    expect(cardText).toContain("E2E Monthly Food Budget");
    expect(cardText).toContain("Mensual");
    expect(cardText).toContain("450");

    // Navigate to single budget page
    await driver.executeScript("arguments[0].click();", budgetCard);
    const bodyText = await waitForBodyText("E2E Monthly Food Budget");
    expect(bodyText).toContain("E2E Monthly Food Budget");
  });
});
