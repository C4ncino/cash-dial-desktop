import { useCategories } from "@/hooks/useStores";

import EntityLabel from "./EntityLabel";

interface Props {
  id: number;
  parentId?: number;
  customName?: string;
  color?: string;
  fallbackName?: string;
}

export default function CategoryName({ id, parentId, customName, color, fallbackName }: Props) {
  const category = useCategories((state) => {
    const find = (categoryId: number) =>
      state.getById?.(categoryId) ?? state.categories?.find((item) => item.id === categoryId);
    return find(id) ?? (parentId === undefined ? undefined : find(parentId));
  });
  return (
    <EntityLabel
      label={customName ?? category?.name}
      icon={category?.icon}
      color={color ?? category?.color}
      fallback={fallbackName}
    />
  );
}
