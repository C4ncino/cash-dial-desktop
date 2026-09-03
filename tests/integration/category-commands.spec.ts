import { closeTauriDriver, createDriver, deleteDatabase, invokeCommand } from "@test/driver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CATEGORY_FUNCTIONS } from "@/types/enums";

function expectCategory(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      color: expect.any(String),
      icon: expect.any(String),
    }),
  );

  const category = value as { fatherId: unknown };
  expect(category.fatherId === null || typeof category.fatherId === "number").toBe(true);
}

function expectCategories(value: unknown) {
  expect(Array.isArray(value)).toBe(true);

  (value as unknown[]).forEach(expectCategory);
}

describe("Category Commands", () => {
  beforeAll(async () => {
    await createDriver();
  });

  afterAll(async () => {
    await closeTauriDriver();
    deleteDatabase();
  });

  it("get_categories returns Category[]", async () => {
    const result = await invokeCommand<unknown>(CATEGORY_FUNCTIONS.get);

    expectCategories(result);
  });

  it("categories contain values", async () => {
    const categories = await invokeCommand<Category[]>(CATEGORY_FUNCTIONS.get);

    expect(categories.length).toBeGreaterThan(0);
  });
});
