import { invoke } from "@tauri-apps/api/core";
import { createStore } from "zustand/vanilla";

import { logger } from "@/lib/logger";
import { CATEGORY_FUNCTIONS } from "@/types/enums";

export const categoryStore = createStore<
  CategoryStore & Omit<Actions<Category>, "add" | "remove" | "update">
>((set, get) => ({
  categories: [] as Category[],

  populate: async () => {
    const categories = (await invoke(CATEGORY_FUNCTIONS.get)) as Category[];
    logger.debug("Categories:", categories);
    return set({ categories });
  },

  getById: (id: number) => get().categories.find((category) => category.id === id),
}));

export function getCategoriesTree(flatCategories: Category[]): CategoryNode[] {
  const map = new Map<number, CategoryNode>();

  for (const cat of flatCategories) {
    map.set(cat.id, {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      children: [],
    });

    if (cat.fatherId !== null) {
      const node = map.get(cat.fatherId);

      if (!node || node.children.length > 0) continue;

      node.children.push({
        id: node.id,
        name: "General",
        icon: node.icon,
        color: node.color,
        children: [],
      });
    }
  }

  const roots: CategoryNode[] = [];

  for (const cat of flatCategories) {
    const node = map.get(cat.id);

    if (!node) continue;

    if (cat.fatherId === null) roots.push(node);
    else {
      const parent = map.get(cat.fatherId);

      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }

  return roots;
}
