import { closeTauriDriver, createDriver, deleteDatabase, driver } from "@test/driver";
import { By, Key, until } from "selenium-webdriver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Tauri - Budget creation", () => {
  beforeAll(async () => {
    await createDriver();
  });

  afterAll(async () => {
    await closeTauriDriver();
    deleteDatabase();
  });

  async function clearAndType(element: any, text: string) {
    await element.sendKeys(Key.chord(Key.CONTROL, "a"));
    await element.sendKeys(Key.BACK_SPACE);
    await element.sendKeys(text);
  }

  it("creates a monthly budget", async () => {
    // Wait for application UI to be ready
    await driver.wait(until.elementLocated(By.css("body")), 10000);
    await driver.sleep(500);

    // Open create budget form
    const openForm = await driver.findElement(By.id("create-budget-button"));
    await openForm.click();

    // Wait for form to load
    await driver.wait(until.elementLocated(By.id("budget-form")), 5000);

    // Fill Name
    const nameInput = await driver.findElement(By.css('#budget-form input[name="name"]'));
    await nameInput.sendKeys("E2E Monthly Food Budget");

    // Select Category (Comida y bebida -> Supermercados)
    const catBtn = await driver.findElement(By.css("#budget-form fieldset.relative > button"));
    await catBtn.click();

    // Wait and click Comida y bebida parent category to expand it
    const parentCat = await driver.findElement(
      By.xpath('//form[@id="budget-form"]//button[contains(., "Comida y Bebida")]'),
    );

    await parentCat.click();

    // Click Supermercados child category to select it
    const childCat = await driver.findElement(
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

    // Wait for modal to close and card to render
    await driver.sleep(500);

    // Verify it renders on the page
    const budgetCard = await driver.wait(
      until.elementLocated(
        By.xpath('//a[contains(@aria-label, "Abrir presupuesto E2E Monthly Food Budget")]'),
      ),
      10000,
    );
    expect(budgetCard).toBeDefined();

    console.log(await budgetCard.isDisplayed());
    console.log(await budgetCard.isEnabled());

    // Verify card content
    const cardText = await budgetCard.getText();
    expect(cardText).toContain("E2E Monthly Food Budget");
    expect(cardText).toContain("Mensual");
    expect(cardText).toContain("450");

    // Navigate to single budget page
    await budgetCard.click();
    await driver.wait(until.elementLocated(By.css("body")), 10000);

    const bodyText = await driver.findElement(By.css("body")).getText();
    expect(bodyText).toContain("E2E Monthly Food Budget");
  });
});
