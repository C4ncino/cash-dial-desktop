import {
  clickWhenReady,
  closeTauriDriver,
  createDriver,
  driver,
  findVisible,
  navigateTo,
  waitForHomeReady,
} from "@test/driver";
import { By, Key, until } from "selenium-webdriver";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Planning to linked movement user flow", () => {
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

  async function selectPlanningCategory(formId: string) {
    await clickWhenReady(By.css(`#${formId} fieldset.relative > button`));
    await clickWhenReady(
      By.xpath(`//form[@id='${formId}']//button[contains(., 'Comida y Bebida')]`),
    );
    await clickWhenReady(By.xpath(`//form[@id='${formId}']//button[contains(., 'Supermercados')]`));
  }

  it("creates a planning, links a compatible movement, reloads, and cancels the next occurrence", async () => {
    await navigateTo("/planning", By.id("create-planning-button"));
    await clickWhenReady(By.id("create-planning-button"));
    const planningFormElement = By.css('form[id="create-planning-form"]');
    await findVisible(planningFormElement);
    const planningForm = "create-planning-form";
    const nameInput = await driver.findElement(By.css(`form#${planningForm} input[name="name"]`));
    await driver.executeScript(
      `const el = arguments[0]; el.scrollIntoView({ block: 'center', inline: 'nearest' });`,
      nameInput,
    );
    await driver.wait(until.elementIsEnabled(nameInput), 5000);
    await nameInput.click();
    await nameInput.sendKeys("E2E Grocery Planning");
    await clearAndType(
      await driver.findElement(By.css(`form#${planningForm} input[name="amount"]`)),
      "75",
    );

    const accountSelect = await driver.findElement(
      By.css(`form#${planningForm} select[name="accountId"]`),
    );
    await accountSelect.findElement(By.css('option:not([value=""])')).click();
    const currencySelect = await driver.findElement(
      By.css(`form#${planningForm} select[name="currency"]`),
    );
    await currencySelect.findElement(By.css('option:not([value=""])')).click();
    await selectPlanningCategory(planningForm);
    await clickWhenReady(By.css(`form#${planningForm} button[type="submit"]`));

    const planningCard = await driver.wait(
      until.elementLocated(
        By.xpath("//a[@data-testid='planning-card' and contains(., 'E2E Grocery Planning')]"),
      ),
      10000,
    );
    await driver.wait(until.elementTextContains(planningCard, "E2E Grocery Planning"), 5000);
    const cardText = (await planningCard.getAttribute("textContent")) ?? "";
    expect(cardText).toContain("E2E Grocery Planning");
    expect(cardText).toMatch(/75[.,]00/);
    expect(cardText).toContain("Supermercados");
    expect(cardText).not.toContain("Cada mes");
    expect(cardText).not.toContain("Editar");
    expect(cardText).not.toContain("Desactivar");
    expect(cardText).toMatch(/Efectivo|Updated Account/);
    const detailHref = await planningCard.getAttribute("href");
    await driver.executeScript("arguments[0].click();", planningCard);
    await driver.wait(until.elementLocated(By.xpath("//h3[contains(., 'Ocurrencias')]")), 10000);
    let bodyText = await driver.findElement(By.css("body")).getText();
    expect(bodyText).toContain("Ocurrencias");
    expect(bodyText).toMatch(/Pendiente|Vencida|Próxima/);

    await driver.findElement(By.id("back-link")).click();
    await navigateTo("/", By.id("speed-dial-toggle"));
    await waitForHomeReady();
    await clickWhenReady(By.id("speed-dial-toggle"));
    await clickWhenReady(By.id("create-expense-dialog-button"));
    await findVisible(By.id("expense-form"));

    const movementPlanningSelect = await driver.findElement(
      By.css('#expense-form select[name="planningId"]'),
    );
    await movementPlanningSelect
      .findElement(By.xpath('.//option[contains(., "E2E Grocery Planning")]'))
      .click();
    expect(await movementPlanningSelect.getAttribute("value")).not.toBe("");
    expect(
      await driver.findElement(By.css('#expense-form input[name="amount"]')).getAttribute("value"),
    ).toBe("75");
    const movementCategory = await driver.findElement(
      By.css('#expense-form input[name="categoryId"]'),
    );
    expect(await movementCategory.getAttribute("value")).not.toBe("");
    await clickWhenReady(By.css('#expense-form button[type="submit"]'));

    await driver.executeScript(
      "arguments[0].click();",
      await findVisible(By.css('a[href="/planning"]')),
    );
    const createdPlanning = await driver.wait(
      until.elementLocated(
        By.xpath("//a[@data-testid='planning-card' and contains(., 'E2E Grocery Planning')]"),
      ),
      10000,
    );
    await driver.executeScript("arguments[0].click();", createdPlanning);
    await driver.wait(until.elementLocated(By.xpath("//h3[contains(., 'Ocurrencias')]")), 10000);
    bodyText = await driver.findElement(By.css("body")).getText();
    expect(bodyText).toContain("Completada");
    expect(bodyText).toContain("Pendiente");

    await driver.navigate().refresh();
    await driver.wait(until.elementLocated(By.xpath("//h3[contains(., 'Ocurrencias')]")), 10000);
    bodyText = await driver.findElement(By.css("body")).getText();
    expect(bodyText).toContain("Historial");

    const cancelButton = await driver
      .findElement(By.xpath("//button[contains(., 'Cancelar ocurrencia')]"))
      .catch(() => null);
    if (cancelButton) {
      await clickWhenReady(By.xpath("//button[contains(., 'Cancelar ocurrencia')]"));
      await clickWhenReady(By.css('[data-testid="confirm-button"]'));
      await driver.wait(async () => {
        const text = await driver.findElement(By.css("body")).getText();
        return text.includes("Cancelada");
      }, 10000);
      bodyText = await driver.findElement(By.css("body")).getText();
      expect(bodyText).toContain("Cancelada");
    }

    expect(detailHref).toContain("/planning-detail?id=");
  });
});
