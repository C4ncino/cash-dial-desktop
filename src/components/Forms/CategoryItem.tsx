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
      className={`px-3 py-4 ${!hasChildren && "hover:bg-zinc-900"} ${isSelected && "bg-zinc-900"} rounded-md`}
    >
      <button
        type="button"
        onClick={() => {
          if (hasChildren) onToggle(node.id);
          else onSelect(node.id);
        }}
        className="flex w-full items-center justify-between"
      >
        <span className="flex items-center gap-2.5">
          <CategoryName id={node.id} customName={node.name} color={node.color} />
        </span>

        {hasChildren && (
          <Icon icon="iconoir:nav-arrow-right" className={isExpanded ? "rotate-90" : ""} />
        )}

        {!hasChildren && isSelected && (
          <Icon icon="iconoir:check" className="ml-auto w-4 h-4 text-blue-400" />
        )}
      </button>

      {hasChildren && isExpanded && (
        <ul className="mt-3 pl-2 border-l-2 border-zinc-800/80 rounded-r-md">
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
