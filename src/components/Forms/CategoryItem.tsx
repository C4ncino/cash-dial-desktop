import { Icon } from "@iconify/react";

import CategoryName from "@/components/General/CategoryName";

type Props = {
  node: CategoryNode;
  expandedParents: Record<number, boolean>;
  selectedId?: number;
  onToggle: (id: number) => void;
  onSelect: (id: number) => void;
};

const CategoryItem = ({ node, expandedParents, selectedId, onToggle, onSelect }: Props) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedParents[node.id];
  const isSelected = selectedId === node.id;

  return (
    <li
      className={`rounded-md px-3 py-4 ${!hasChildren && "hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"} ${isSelected && "bg-zinc-200/60 dark:bg-zinc-800/60"}`}
    >
      <button
        type="button"
        onClick={() => {
          if (hasChildren) onToggle(node.id);
          else onSelect(node.id);
        }}
        className="flex w-full items-center justify-between"
      >
        <CategoryName id={node.id} customName={node.name} color={node.color} />

        {hasChildren && (
          <Icon icon="iconoir:nav-arrow-right" className={isExpanded ? "rotate-90" : ""} />
        )}

        {!hasChildren && isSelected && (
          <Icon icon="iconoir:check" className="ml-auto h-4 w-4 text-blue-600 dark:text-blue-400" />
        )}
      </button>

      {hasChildren && isExpanded && (
        <ul className="mt-3 rounded-r-md border-l-2 border-zinc-200/80 pl-2 dark:border-zinc-800/80">
          {node.children.map((child) => (
            <CategoryItem
              key={child.id}
              node={child}
              expandedParents={expandedParents}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export default CategoryItem;
