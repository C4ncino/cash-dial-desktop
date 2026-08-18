import { closeTauriDriver, createDriver, deleteDatabase, driver } from "@test/driver";
import { By, Key, until } from "selenium-webdriver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Movement E2E", () => {
  beforeAll(async () => {
    await createDriver();
  });

  afterAll(async () => {
    await closeTauriDriver();
    deleteDatabase();
  });

  // Helpers
  async function openSpeedDial() {
    const speedDialLocator = By.css(".speed-dial");
    const classes = await driver.findElement(speedDialLocator).getAttribute("class");

    if (!classes) return false;

    if (!classes.includes("is-open")) {
      const toggle = await driver.findElement(By.id("speed-dial-toggle"));
      await toggle.click();
      await driver.wait(async () => {
        try {
          const cls = await driver.findElement(speedDialLocator).getAttribute("class");

          if (!cls) return false;

          return cls.includes("is-open");
        } catch {
          return false;
        }
      }, 3000);
    }
  }

  async function clearAndType(element: any, text: string) {
    await element.sendKeys(Key.chord(Key.CONTROL, "a"));
    await element.sendKeys(Key.BACK_SPACE);
    await element.sendKeys(text);
  }

  async function getAccountBalance(accountId: number): Promise<number> {
    const cardLocator = By.css(`a[href="/account?id=${accountId}"]`);
    return driver.wait(async () => {
      try {
        const card = await driver.findElement(cardLocator);
        const balanceText = await card.findElement(By.css("strong")).getText();
        const cleaned = balanceText.replace(/[^\d.,-]/g, "");
        const lastComma = cleaned.lastIndexOf(",");
        const lastDot = cleaned.lastIndexOf(".");

        if (lastComma > lastDot) return Number.parseFloat(cleaned.replace(/\./g, "").replace(/,/g, "."));
        if (lastDot > lastComma) return Number.parseFloat(cleaned.replace(/,/g, ""));
        if (lastComma !== -1) {
          return Number.parseFloat(cleaned.match(/,\d{2}$/) ? cleaned.replace(/,/g, ".") : cleaned.replace(/,/g, ""));
        }
        return Number.parseFloat(cleaned);
      } catch {
        return false;
      }
    }, 10000);
  }

  it("creates an income movement and verifies its rendering and details", async () => {
    // wait app UI
    await driver.wait(until.elementLocated(By.css("body")), 10000);

    await driver.sleep(200);

    const homeLink = await driver.findElement(By.css('a[href="/"]'));
    await homeLink.click();
    await driver.wait(until.elementLocated(By.id("speed-dial-toggle")), 10000);

    const initialBalance = await getAccountBalance(1);

    await openSpeedDial();
    const createIncomeBtn = await driver.findElement(By.id("create-income-dialog-button"));
    await createIncomeBtn.click();
    await driver.wait(until.elementLocated(By.id("income-form")), 5000);

    const incomeAmountInput = await driver.findElement(By.css('#income-form input[name="amount"]'));
    await clearAndType(incomeAmountInput, "150.00");

    const incomeAccountSelect = await driver.findElement(
      By.css('#income-form select[name="accountId"]'),
    );
    const incomeAccountOption = await driver.wait(
      until.elementLocated(By.css('#income-form select[name="accountId"] option[value="1"]')),
      10000,
    );
    await incomeAccountOption.click();

    const incomeCatBtn = await driver.findElement(
      By.css("#income-form fieldset.relative > button"),
    );
    await incomeCatBtn.click();
    const incomeParentBtn = await driver.findElement(
      By.xpath('//form[@id="income-form"]//button[contains(., "Ingresos")]'),
    );
    await driver.executeScript("arguments[0].click();", incomeParentBtn);
    const incomeChildBtn = await driver.findElement(
      By.xpath('//form[@id="income-form"]//button[contains(., "Sueldo")]'),
    );
    await driver.executeScript("arguments[0].click();", incomeChildBtn);

    const incomeDescInput = await driver.findElement(
      By.css('#income-form input[name="description"]'),
    );
    await incomeDescInput.sendKeys("E2E Income Test");

    const incomeSubmitBtn = await driver.findElement(By.css('#income-form button[type="submit"]'));
    await incomeSubmitBtn.click();

    // Verify it renders on movements list page
    const movementsLink = await driver.findElement(By.css('a[href="/movements"]'));
    await movementsLink.click();
    await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Movimientos')]")),
      10000,
    );

    const bodyText = await driver.findElement(By.css("body")).getText();
    expect(bodyText).toContain("Sueldo");
    expect(bodyText).toMatch(/150[.,]00/);

    // Click on the card to open single page view and validate details
    const sueldoCard = await driver.findElement(
      By.xpath("//a[contains(@href, '/movement') and .//p[text()='Sueldo']][1]"),
    );
    await sueldoCard.click();

    await driver.wait(
      until.elementLocated(By.xpath("//h2[contains(text(), 'Detalles del movimiento')]")),
      10000,
    );

    const detailsText = await driver.findElement(By.css("body")).getText();
    expect(detailsText).toContain("Sueldo");
    expect(detailsText).toContain("Ingreso");
    expect(detailsText).toContain("Efectivo");
    expect(detailsText).toContain("E2E Income Test");

    const backLink = await driver.findElement(By.id("back-link"));
    await backLink.click();
    await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Movimientos')]")),
      10000,
    );

    const homeLinkEnd = await driver.findElement(By.css('a[href="/"]'));
    await homeLinkEnd.click();
    await driver.wait(until.elementLocated(By.id("speed-dial-toggle")), 10000);

    const finalBalance = await getAccountBalance(1);
    expect(finalBalance).toBeCloseTo(initialBalance + 150.0, 2);
  });

  it("creates an expense movement and verifies its rendering and details", async () => {
    // wait app UI
    await driver.wait(until.elementLocated(By.css("body")), 10000);
    await driver.sleep(200);

    const homeLink = await driver.findElement(By.css('a[href="/"]'));
    await homeLink.click();
    await driver.wait(until.elementLocated(By.id("speed-dial-toggle")), 10000);

    const initialBalance = await getAccountBalance(1);

    await openSpeedDial();
    const createExpenseBtn = await driver.findElement(By.id("create-expense-dialog-button"));
    await createExpenseBtn.click();
    await driver.wait(until.elementLocated(By.id("expense-form")), 5000);

    const expenseAmountInput = await driver.findElement(
      By.css('#expense-form input[name="amount"]'),
    );
    await clearAndType(expenseAmountInput, "45.50");

    const expenseAccountSelect = await driver.findElement(
      By.css('#expense-form select[name="accountId"]'),
    );
    const expenseAccountOption = await driver.wait(
      until.elementLocated(By.css('#expense-form select[name="accountId"] option[value="1"]')),
      10000,
    );
    await expenseAccountOption.click();

    const expenseCatBtn = await driver.findElement(
      By.css("#expense-form fieldset.relative > button"),
    );
    await expenseCatBtn.click();
    const expenseParentBtn = await driver.findElement(
      By.xpath('//form[@id="expense-form"]//button[contains(., "Comida y Bebida")]'),
    );
    await driver.executeScript("arguments[0].click();", expenseParentBtn);
    const expenseChildBtn = await driver.findElement(
      By.xpath('//form[@id="expense-form"]//button[contains(., "Supermercados")]'),
    );
    await driver.executeScript("arguments[0].click();", expenseChildBtn);

    const expenseDescInput = await driver.findElement(
      By.css('#expense-form input[name="description"]'),
    );
    await expenseDescInput.sendKeys("E2E Expense Test");

    const expenseSubmitBtn = await driver.findElement(
      By.css('#expense-form button[type="submit"]'),
    );
    await expenseSubmitBtn.click();
    await driver.sleep(500);

    // Verify it renders on movements list page
    const movementsLink = await driver.findElement(By.css('a[href="/movements"]'));
    await movementsLink.click();
    await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Movimientos')]")),
      10000,
    );

    const bodyText = await driver.findElement(By.css("body")).getText();
    expect(bodyText).toContain("Supermercados");
    expect(bodyText).toMatch(/45[.,]50/);

    // Click on the card to open single page view and validate details
    const expenseCard = await driver.findElement(
      By.xpath("//a[contains(@href, '/movement') and .//p[text()='Supermercados']][1]"),
    );
    await expenseCard.click();

    await driver.wait(
      until.elementLocated(By.xpath("//h2[contains(text(), 'Detalles del movimiento')]")),
      10000,
    );

    const detailsText = await driver.findElement(By.css("body")).getText();
    expect(detailsText).toContain("Supermercados");
    expect(detailsText).toContain("Gasto");
    expect(detailsText).toContain("Efectivo");
    expect(detailsText).toContain("E2E Expense Test");

    const backLink = await driver.findElement(By.id("back-link"));
    await backLink.click();
    await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Movimientos')]")),
      10000,
    );

    const homeLinkEnd = await driver.findElement(By.css('a[href="/"]'));
    await homeLinkEnd.click();
    await driver.wait(until.elementLocated(By.id("speed-dial-toggle")), 10000);

    const finalBalance = await getAccountBalance(1);
    expect(finalBalance).toBeCloseTo(initialBalance - 45.5, 2);
  });

  it("creates a transfer movement and verifies its rendering and details", async () => {
    // wait app UI
    await driver.wait(until.elementLocated(By.css("body")), 10000);

    await driver.sleep(200);

    const homeLink = await driver.findElement(By.css('a[href="/"]'));
    await homeLink.click();
    await driver.wait(until.elementLocated(By.id("speed-dial-toggle")), 10000);

    const initialSourceBalance = await getAccountBalance(1);
    const initialDestBalance = await getAccountBalance(2);

    await openSpeedDial();
    const createTransferBtn = await driver.findElement(By.id("create-transfer-dialog-button"));
    await createTransferBtn.click();
    await driver.wait(until.elementLocated(By.id("transfer-form")), 5000);

    const transferAmountInput = await driver.findElement(
      By.css('#transfer-form input[name="amount"]'),
    );
    await clearAndType(transferAmountInput, "100.00");

    const transferAccountSelect = await driver.findElement(
      By.css('#transfer-form select[name="accountId"]'),
    );
    const transferAccountOption = await driver.wait(
      until.elementLocated(By.css('#transfer-form select[name="accountId"] option[value="1"]')),
      10000,
    );
    await transferAccountOption.click();

    const transferToAccountSelect = await driver.findElement(
      By.css('#transfer-form select[name="toAccountId"]'),
    );
    await transferToAccountSelect.click();
    const transferToAccountOption = await transferToAccountSelect.findElement(
      By.xpath('./option[text()="Débito"]'),
    );
    await transferToAccountOption.click();

    const transferDescInput = await driver.findElement(
      By.css('#transfer-form input[name="description"]'),
    );
    await transferDescInput.sendKeys("E2E Transfer Test");

    const transferSubmitBtn = await driver.findElement(
      By.css('#transfer-form button[type="submit"]'),
    );
    await transferSubmitBtn.click();
    await driver.sleep(500);

    // Verify it renders on movements list page
    const movementsLink = await driver.findElement(By.css('a[href="/movements"]'));
    await movementsLink.click();
    await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Movimientos')]")),
      10000,
    );

    const bodyText = await driver.findElement(By.css("body")).getText();
    expect(bodyText).toContain("Transferencia");
    expect(bodyText).toMatch(/100[.,]00/);

    // Click on the card to open single page view and validate details
    const transferCard = await driver.findElement(
      By.xpath("//a[contains(@href, '/movement') and .//p[text()='Transferencia']][1]"),
    );
    await transferCard.click();

    await driver.wait(
      until.elementLocated(By.xpath("//h2[contains(text(), 'Detalles del movimiento')]")),
      10000,
    );

    const detailsText = await driver.findElement(By.css("body")).getText();
    expect(detailsText).toContain("Transferencia");
    expect(detailsText).toContain("Transferencia");
    expect(detailsText).toContain("Efectivo");
    expect(detailsText).toContain("Débito");
    expect(detailsText).toContain("E2E Transfer Test");

    const backLink = await driver.findElement(By.id("back-link"));
    await backLink.click();
    await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Movimientos')]")),
      10000,
    );

    const homeLinkEnd = await driver.findElement(By.css('a[href="/"]'));
    await homeLinkEnd.click();
    await driver.wait(until.elementLocated(By.id("speed-dial-toggle")), 10000);

    const finalSourceBalance = await getAccountBalance(1);
    const finalDestBalance = await getAccountBalance(2);
    expect(finalSourceBalance).toBeCloseTo(initialSourceBalance - 100.0, 2);
    expect(finalDestBalance).toBeCloseTo(initialDestBalance + 100.0, 2);
  });
});
