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
import { By, Key, until, type WebElement } from "selenium-webdriver";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ACCOUNT_FUNCTIONS, MOVEMENT_FUNCTIONS } from "@/types/enums";

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
      await clickWhenReady(By.id("speed-dial-toggle"), 10_000);
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

  async function clearAndType(element: WebElement, text: string) {
    await element.sendKeys(Key.chord(Key.CONTROL, "a"));
    await element.sendKeys(Key.BACK_SPACE);
    await element.sendKeys(text);
  }

  async function getAccountBalance(accountId: number): Promise<number> {
    return invokeCommand<number>(ACCOUNT_FUNCTIONS.getBalance, { id: accountId });
  }

  async function getAccountBalanceByName(name: string): Promise<number> {
    const accounts = await invokeCommand<Account[]>(ACCOUNT_FUNCTIONS.get);
    const account = accounts.find((candidate) => candidate.name === name);
    if (!account) {
      throw new Error(
        `Seeded account "${name}" was not found. Available accounts: ${accounts
          .map((candidate) => candidate.name)
          .join(", ")}`,
      );
    }
    return getAccountBalance(account.id);
  }

  async function waitForMovement(description: string): Promise<Movement> {
    return driver.wait<Movement>(
      async () => {
        try {
          const movements = await invokeCommand<Movement[]>(MOVEMENT_FUNCTIONS.get);
          return movements.find((movement) => movement.description === description) ?? false;
        } catch {
          return false;
        }
      },
      15_000,
      `Movement was not persisted: ${description}`,
    );
  }

  async function waitForRenderedMovementCard(locator: By): Promise<WebElement> {
    return driver.wait<WebElement>(
      async () => {
        try {
          const cards = await driver.findElements(locator);
          for (const card of cards) {
            if (await card.isDisplayed()) {
              await card.getText();
              return card;
            }
          }
        } catch {
          // Astro may replace the list while its client store is loading.
        }
        return false;
      },
      15_000,
      `Movement card was not rendered: ${locator}`,
    );
  }

  it("opens the labeled creation menu on every dial page and prefills account context", async () => {
    await findVisible(By.id("create-movement-menu-button"));
    await navigateTo("/movements", By.id("create-movement-menu-button"));
    await navigateTo("/", By.id("create-movement-menu-button"));
    await navigateTo("/account?id=1", By.id("create-movement-menu-button"));

    await clickWhenReady(By.id("create-movement-menu-button"));
    await clickWhenReady(By.id("labeled-create-movement-2-button"));
    await findVisible(By.id("expense-form"));

    expect(
      await driver.findElement(By.css('#expense-form select[name="accountId"]')).getAttribute("value"),
    ).toBe("1");
  });

  it("creates an income movement and verifies its rendering and details", async () => {
    // wait app UI
    await waitForHomeReady();

    const initialBalance = await getAccountBalance(1);

    await openSpeedDial();
    await clickWhenReady(By.id("create-income-dialog-button"));
    await findVisible(By.id("income-form"));

    const incomeAmountInput = await driver.findElement(By.css('#income-form input[name="amount"]'));
    await clearAndType(incomeAmountInput, "150.00");

    await driver.findElement(By.css('#income-form select[name="accountId"]'));
    const incomeAccountOption = await driver.wait(
      until.elementLocated(By.css('#income-form select[name="accountId"] option[value="1"]')),
      10000,
    );
    await incomeAccountOption.click();

    await clickWhenReady(By.css("#income-form fieldset.relative > button"));
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

    await clickWhenReady(By.css('#income-form button[type="submit"]'));
    await waitForMovement("E2E Income Test");

    // Verify it renders on movements list page
    await navigateTo("/movements", By.xpath("//h1[contains(text(), 'Movimientos')]"));

    const sueldoCardLocator = By.xpath(
      "//a[contains(@href, '/movement') and .//p[text()='Sueldo']][1]",
    );

    await waitForRenderedMovementCard(sueldoCardLocator);
    const bodyText = await driver.findElement(By.css("body")).getText();
    expect(bodyText).toContain("Sueldo");
    expect(bodyText).toMatch(/150[.,]00/);

    // Click on the card to open single page view and validate details
    await clickWhenReady(sueldoCardLocator);

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

    await navigateTo("/", By.id("speed-dial-toggle"));
    await waitForHomeReady();

    const finalBalance = await getAccountBalance(1);
    expect(finalBalance).toBeCloseTo(initialBalance + 150.0, 2);
  });

  it("creates an expense movement and verifies its rendering and details", async () => {
    // wait app UI
    await waitForHomeReady();

    const initialBalance = await getAccountBalance(1);

    await openSpeedDial();
    await clickWhenReady(By.id("create-expense-dialog-button"));
    await findVisible(By.id("expense-form"));

    const expenseAmountInput = await driver.findElement(
      By.css('#expense-form input[name="amount"]'),
    );
    await clearAndType(expenseAmountInput, "45.50");

    await driver.findElement(By.css('#expense-form select[name="accountId"]'));
    const expenseAccountOption = await driver.wait(
      until.elementLocated(By.css('#expense-form select[name="accountId"] option[value="1"]')),
      10000,
    );
    await expenseAccountOption.click();

    await clickWhenReady(By.css("#expense-form fieldset.relative > button"));
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

    await clickWhenReady(By.css('#expense-form button[type="submit"]'));
    await waitForMovement("E2E Expense Test");
    // Verify it renders on movements list page
    await navigateTo("/movements", By.xpath("//h1[contains(text(), 'Movimientos')]"));

    const expenseCardLocator = By.xpath(
      "//a[contains(@href, '/movement') and .//p[text()='Supermercados']][1]",
    );
    await waitForRenderedMovementCard(expenseCardLocator);
    const bodyText = await driver.findElement(By.css("body")).getText();
    expect(bodyText).toContain("Supermercados");
    expect(bodyText).toMatch(/45[.,]50/);

    // Click on the card to open single page view and validate details
    await clickWhenReady(expenseCardLocator);

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

    await navigateTo("/", By.id("speed-dial-toggle"));
    await waitForHomeReady();

    const finalBalance = await getAccountBalance(1);
    expect(finalBalance).toBeCloseTo(initialBalance - 45.5, 2);
  });

  it("creates a transfer movement and verifies its rendering and details", async () => {
    // wait app UI
    await waitForHomeReady();

    const initialSourceBalance = await getAccountBalance(1);
    const initialDestBalance = await getAccountBalance(2);

    await openSpeedDial();
    await clickWhenReady(By.id("create-transfer-dialog-button"));
    await findVisible(By.id("transfer-form"));

    const transferAmountInput = await driver.findElement(
      By.css('#transfer-form input[name="amount"]'),
    );
    await clearAndType(transferAmountInput, "100.00");

    await driver.findElement(By.css('#transfer-form select[name="accountId"]'));
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

    await clickWhenReady(By.css('#transfer-form button[type="submit"]'));
    await waitForMovement("E2E Transfer Test");
    // Verify it renders on movements list page
    await navigateTo("/movements", By.xpath("//h1[contains(text(), 'Movimientos')]"));

    const transferCardLocator = By.xpath(
      "//a[contains(@href, '/movement') and .//p[text()='Transferencia']][1]",
    );
    await waitForRenderedMovementCard(transferCardLocator);
    const bodyText = await driver.findElement(By.css("body")).getText();
    expect(bodyText).toContain("Transferencia");
    expect(bodyText).toMatch(/100[.,]00/);

    // Click on the card to open single page view and validate details
    await clickWhenReady(transferCardLocator);

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

    await navigateTo("/", By.id("speed-dial-toggle"));
    await waitForHomeReady();

    const finalSourceBalance = await getAccountBalance(1);
    const finalDestBalance = await getAccountBalance(2);
    expect(finalSourceBalance).toBeCloseTo(initialSourceBalance - 100.0, 2);
    expect(finalDestBalance).toBeCloseTo(initialDestBalance + 100.0, 2);
  });

  it("creates a cross-currency transfer with distinct charged and received amounts", async () => {
    await waitForHomeReady();

    const initialSourceBalance = await getAccountBalanceByName("USD Wallet");
    const initialDestinationBalance = await getAccountBalance(1);

    await openSpeedDial();
    await clickWhenReady(By.id("create-transfer-dialog-button"));
    await findVisible(By.id("transfer-form"));

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

    await clickWhenReady(By.css('#transfer-form button[type="submit"]'));
    await waitForMovement("E2E Cross Currency Transfer");

    await navigateTo("/movements", By.xpath("//h1[contains(text(), 'Movimientos')]"));

    const crossCurrencyCardLocator = By.xpath(
      "//a[starts-with(@href, '/movement?id=') and contains(., 'USD Wallet') and contains(., '10')][1]",
    );
    await waitForRenderedMovementCard(crossCurrencyCardLocator);
    await clickWhenReady(crossCurrencyCardLocator);
    await driver.wait(
      until.elementLocated(By.xpath("//h2[contains(text(), 'Detalles del movimiento')]")),
      10000,
    );
    const details = await driver.findElement(By.css("body")).getText();
    expect(details).toContain("E2E Cross Currency Transfer");
    expect(details).toMatch(/10[.,]00/);
    expect(details).toContain("USD Wallet");
    expect(details).toContain("Efectivo");

    const originalAmountText = await driver
      .findElement(By.xpath('//dt[normalize-space(.)="Monto original"]/following-sibling::dd'))
      .getText();
    const convertedAmountText = await driver
      .findElement(By.xpath('//dt[normalize-space(.)="Monto convertido"]/following-sibling::dd'))
      .getText();
    const exchangeRateText = await driver
      .findElement(By.xpath('//dt[normalize-space(.)="Tipo de cambio"]/following-sibling::dd'))
      .getText();
    expect(originalAmountText).toMatch(/10[.,]00/);
    expect(convertedAmountText).toMatch(/180[.,]00/);
    expect(exchangeRateText).toContain("1 USD = 18.0000 MXN");

    await driver.wait(
      until.elementLocated(By.xpath("//h2[contains(text(), 'Detalles del movimiento')]")),
      10000,
    );
    expect(await driver.findElement(By.css("body")).getText()).toContain(
      "E2E Cross Currency Transfer",
    );

    const backLink = await driver.findElement(By.id("back-link"));
    await backLink.click();
    await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Movimientos')]")),
      10000,
    );

    await navigateTo("/", By.id("speed-dial-toggle"));
    await waitForHomeReady();
    expect(await getAccountBalanceByName("USD Wallet")).toBeCloseTo(initialSourceBalance - 10, 2);
    expect(await getAccountBalance(1)).toBeCloseTo(initialDestinationBalance + 180, 2);
  });
});
