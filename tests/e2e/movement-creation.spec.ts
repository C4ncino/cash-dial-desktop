import { closeTauriDriver, createDriver, driver, waitForHomeReady } from "@test/driver";
import { By, Key, until, type WebElement } from "selenium-webdriver";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Movement E2E", () => {
  beforeEach(async () => {
    await createDriver({ freshDatabase: true });
    await waitForHomeReady();
  });

  afterEach(async () => {
    await closeTauriDriver();
  });

  // Helpers
  async function openSpeedDial() {
    const speedDialLocator = By.css(".speed-dial");
    const classes = await driver.wait(async () => {
      try {
        return await driver.findElement(speedDialLocator).getAttribute("class");
      } catch {
        return false;
      }
    }, 10000);

    if (!classes) return false;

    if (!classes.includes("is-open")) {
      await driver.wait(async () => {
        try {
          // Locate and click in the same retry. Hydration can replace the
          // toggle between separate findElement and click calls.
          await driver.findElement(By.id("speed-dial-toggle")).click();
          return true;
        } catch {
          return false;
        }
      }, 10000);
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
    return driver.wait<number>(async () => {
      try {
        const card = await driver.findElement(cardLocator);
        const balanceText = await card.findElement(By.css("strong")).getText();
        const cleaned = balanceText.replace(/[^\d.,-]/g, "");
        const lastComma = cleaned.lastIndexOf(",");
        const lastDot = cleaned.lastIndexOf(".");

        if (lastComma > lastDot)
          return Number.parseFloat(cleaned.replace(/\./g, "").replace(/,/g, "."));
        if (lastDot > lastComma) return Number.parseFloat(cleaned.replace(/,/g, ""));
        if (lastComma !== -1) {
          return Number.parseFloat(
            cleaned.match(/,\d{2}$/) ? cleaned.replace(/,/g, ".") : cleaned.replace(/,/g, ""),
          );
        }
        return Number.parseFloat(cleaned);
      } catch {
        return false;
      }
    }, 10000);
  }

  async function getAccountBalanceByName(name: string): Promise<number> {
    const card = await driver.wait(
      until.elementLocated(
        By.xpath(`//a[starts-with(@href, '/account?id=') and contains(., '${name}')]`),
      ),
      10000,
    );
    const balanceText = await card.findElement(By.css("strong")).getText();
    const cleaned = balanceText.replace(/[^\d.,-]/g, "");
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot)
      return Number.parseFloat(cleaned.replace(/\./g, "").replace(/,/g, "."));
    return Number.parseFloat(cleaned.replace(/,/g, ""));
  }

  it("creates an income movement and verifies its rendering and details", async () => {
    // wait app UI
    await waitForHomeReady();
    const homeLink = await driver.wait(until.elementLocated(By.css('a[href="/"]')), 15000);
    await homeLink.click();
    await driver.wait(until.elementLocated(By.id("speed-dial-toggle")), 10000);

    const initialBalance = await getAccountBalance(1);

    await openSpeedDial();
    const createIncomeBtn = await driver.findElement(By.id("create-income-dialog-button"));
    await createIncomeBtn.click();
    await driver.wait(until.elementLocated(By.id("income-form")), 5000);

    const incomeAmountInput = await driver.findElement(By.css('#income-form input[name="amount"]'));
    await clearAndType(incomeAmountInput, "150.00");

    await driver.findElement(
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
    await waitForHomeReady();
    const homeLink = await driver.wait(until.elementLocated(By.css('a[href="/"]')), 15000);
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

    await driver.findElement(
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
    await waitForHomeReady();
    const homeLink = await driver.wait(until.elementLocated(By.css('a[href="/"]')), 15000);
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

    await driver.findElement(
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

  it("creates a cross-currency transfer with distinct charged and received amounts", async () => {
    await driver.get("http://tauri.localhost/");
    await waitForHomeReady();

    const initialSourceBalance = await getAccountBalanceByName("USD Wallet");
    const initialDestinationBalance = await getAccountBalance(1);

    await openSpeedDial();
    await driver.findElement(By.id("create-transfer-dialog-button")).click();
    await driver.wait(until.elementLocated(By.id("transfer-form")), 5000);

    const amount = await driver.findElement(By.css('#transfer-form input[name="amount"]'));
    await clearAndType(amount, "10.00");

    const source = await driver.findElement(By.css('#transfer-form select[name="accountId"]'));
    await source.findElement(By.xpath('.//option[contains(., "USD Wallet")]')).click();

    const destination = await driver.findElement(
      By.css('#transfer-form select[name="toAccountId"]'),
    );
    await destination.findElement(By.xpath('.//option[contains(., "Efectivo")]')).click();

    const accountAmount = await driver.wait(
      until.elementLocated(By.css('#transfer-form input[name="accountAmount"]')),
      5000,
    );
    await clearAndType(accountAmount, "180.00");
    await driver
      .findElement(By.css('#transfer-form input[name="description"]'))
      .sendKeys("E2E Cross Currency Transfer");
    await driver.findElement(By.css('#transfer-form button[type="submit"]')).click();

    await driver.wait(until.elementLocated(By.css('a[href="/movements"]')), 10000);
    await driver.findElement(By.css('a[href="/movements"]')).click();
    await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Movimientos')]")),
      10000,
    );

    const movement = await driver.wait<WebElement>(async () => {
      const cards = await driver.findElements(By.css('a[href^="/movement?id="]'));
      for (const card of cards) {
        const text = await card.getText();
        if (text.includes("10") && text.includes("USD Wallet")) return card;
      }
      return false;
    }, 10000);
    await movement.click();
    await driver.wait(
      until.elementLocated(By.xpath("//h2[contains(text(), 'Detalles del movimiento')]")),
      10000,
    );
    const details = await driver.findElement(By.css("body")).getText();
    expect(details).toContain("E2E Cross Currency Transfer");
    expect(details).toMatch(/10[.,]00/);
    expect(details).toContain("USD Wallet");
    expect(details).toContain("Efectivo");

    await driver.navigate().refresh();
    await driver.wait(
      until.elementLocated(By.xpath("//h2[contains(text(), 'Detalles del movimiento')]")),
      10000,
    );
    expect(await driver.findElement(By.css("body")).getText()).toContain(
      "E2E Cross Currency Transfer",
    );

    await driver.get("http://tauri.localhost/");
    await waitForHomeReady();
    expect(await getAccountBalanceByName("USD Wallet")).toBeCloseTo(initialSourceBalance - 10, 2);
    expect(await getAccountBalance(1)).toBeCloseTo(initialDestinationBalance + 180, 2);
  });
});
