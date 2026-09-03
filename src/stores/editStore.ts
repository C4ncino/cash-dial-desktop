import { createStore } from "zustand/vanilla";

import type { EDIT_TYPES } from "@/types/enums";

export const editStore = createStore<EditStore>((set) => ({
  id: null,
  type: null,
  setId: (id: number | null, type: EDIT_TYPES | null) => set({ id, type }),
  clear: () => set({ id: null, type: null }),
}));
