import { beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/lib/logger";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.unmock("@/stores/categoryStore");

import { invoke } from "@tauri-apps/api/core";

import { categoryStore, getCategoriesTree } from "@/stores/categoryStore";

const mockInvoke = vi.mocked(invoke);

const category: Category = {
  id: 1,
  fatherId: null,
  name: "Food & Drink",
  icon: "apple",
  color: "#00a63e",
};

describe("categoryStore", () => {
  beforeEach(() => {
    logger.debug("Resetting categoryStore state for test");
    categoryStore.setState({
      categories: [],
    });

    vi.clearAllMocks();
  });

  it("populate loads categories", async () => {
    mockInvoke.mockResolvedValue([category]);

    await categoryStore.getState().populate();

    expect(categoryStore.getState().categories).toEqual([category]);
  });

  it("getById returns category", () => {
    categoryStore.setState({
      categories: [category],
    });

    expect(categoryStore.getState().getById(1)).toEqual(category);
  });

  it("returns undefined for missing category", () => {
    expect(categoryStore.getState().getById(999)).toBeUndefined();
  });
});

describe("getCategoriesTree", () => {
  it("returns empty array when categories list is empty", () => {
    expect(getCategoriesTree([])).toEqual([]);
  });

  it("should add a category as father if their father does not exist", () => {
    const child: Category = {
      id: 2,
      fatherId: 999,
      name: "Groceries",
      icon: "cart",
      color: "#00a63e",
    };

    const tree = getCategoriesTree([child]);
    expect(tree).toEqual([
      {
        id: 2,
        name: "Groceries",
        icon: "cart",
        color: "#00a63e",
        children: [],
      },
    ]);
  });

  it("adds General child to parent category and none to simple children", () => {
    const parent: Category = {
      id: 1,
      fatherId: null,
      name: "Food",
      icon: "apple",
      color: "#00a63e",
    };
    const child: Category = {
      id: 2,
      fatherId: 1,
      name: "Groceries",
      icon: "cart",
      color: "#00a63e",
    };

    const tree = getCategoriesTree([parent, child]);
    expect(tree).toEqual([
      {
        id: 1,
        name: "Food",
        icon: "apple",
        color: "#00a63e",
        children: [
          {
            id: 1,
            name: "General",
            icon: "apple",
            color: "#00a63e",
            children: [],
          },
          {
            id: 2,
            name: "Groceries",
            icon: "cart",
            color: "#00a63e",
            children: [],
          },
        ],
      },
    ]);
  });

  it("adds General child to nested parent category only if it has children itself", () => {
    const root: Category = {
      id: 1,
      fatherId: null,
      name: "Food",
      icon: "apple",
      color: "#00a63e",
    };
    const parent: Category = {
      id: 2,
      fatherId: 1,
      name: "Groceries",
      icon: "cart",
      color: "#00a63e",
    };
    const child: Category = {
      id: 3,
      fatherId: 2,
      name: "Fruits",
      icon: "apple",
      color: "#00a63e",
    };

    const tree = getCategoriesTree([root, parent, child]);
    expect(tree).toEqual([
      {
        id: 1,
        name: "Food",
        icon: "apple",
        color: "#00a63e",
        children: [
          {
            id: 1,
            name: "General",
            icon: "apple",
            color: "#00a63e",
            children: [],
          },
          {
            id: 2,
            name: "Groceries",
            icon: "cart",
            color: "#00a63e",
            children: [
              {
                id: 2,
                name: "General",
                icon: "cart",
                color: "#00a63e",
                children: [],
              },
              {
                id: 3,
                name: "Fruits",
                icon: "apple",
                color: "#00a63e",
                children: [],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("does not add General category if category does not have any children", () => {
    const single: Category = {
      id: 1,
      fatherId: null,
      name: "Other",
      icon: "box",
      color: "#4a5565",
    };

    const tree = getCategoriesTree([single]);
    expect(tree).toEqual([
      {
        id: 1,
        name: "Other",
        icon: "box",
        color: "#4a5565",
        children: [],
      },
    ]);
  });
});
