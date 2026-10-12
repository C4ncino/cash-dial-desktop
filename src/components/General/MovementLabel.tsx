import EntityLabel from "@/components/General/EntityLabel";
import { useCategories } from "@/hooks/useStores";

interface Props {
  categoryId?: number;
  description?: string | null;
  className?: string;
}

export default function MovementLabel({ categoryId, description, className }: Props) {
  const category = useCategories((state) =>
    categoryId === undefined
      ? undefined
      : state.getById?.(categoryId) ?? state.categories?.find((item) => item.id === categoryId),
  );
  const label = description?.trim() || category?.name || "Categoría";

  return (
    <EntityLabel
      label={label}
      icon={category?.icon || "tag"}
      color={category?.color || "#71717a"}
      className={className}
    />
  );
}
