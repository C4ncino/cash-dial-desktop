import EntityIcon from "@/components/General/EntityIcon";
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
    <span className={`flex min-w-0 items-center gap-2 ${className ?? ""}`}>
      <EntityIcon
        icon={category?.icon || "tag"}
        color={category?.color || "#71717a"}
        size="sm"
        data-testid="movement-category-icon"
      />
      <span className="truncate" title={label}>
        {label}
      </span>
    </span>
  );
}
