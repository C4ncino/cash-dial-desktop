import { Icon } from "@iconify/react";
import { useStore } from "zustand";

import { categoryStore } from "@/stores/categoryStore";

interface Props {
  id: number;
  parentId?: number;
  customName?: string;
  color?: string;
  fallbackName?: string;
}

const CategoryName = ({ id, parentId, customName, color, fallbackName }: Props) => {
  const category = useStore(categoryStore, (state) =>
    state?.getById
      ? state.getById(id) ?? (parentId === undefined ? undefined : state.getById(parentId))
      : state?.categories?.find((item) => item.id === id) ??
        (parentId === undefined
          ? undefined
          : state?.categories?.find((item) => item.id === parentId)),
  );

  return (
    <span className="inline-flex items-center gap-1.5">
      {category && (
        <Icon
          icon={`iconoir:${category.icon}`}
          style={{ color: color ?? category.color }}
          className="h-4 w-4"
        />
      )}
      {customName ?? category?.name ?? fallbackName ?? "—"}
    </span>
  );
};

export default CategoryName;
