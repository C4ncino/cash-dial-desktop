import { Icon } from "@iconify/react";

import CategoryName from "@/components/General/CategoryName";

import {
  categorySelectChildrenClassName,
  categorySelectOptionClassName,
  categorySelectSelectedOptionClassName,
} from "./categorySelectStyles";

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
    <li className="rounded-md p-1">
      <button
        type="button"
        aria-expanded={hasChildren ? isExpanded : undefined}
        onClick={() => {
          if (hasChildren) onToggle(node.id);
          else onSelect(node.id);
        }}
        className={`${categorySelectOptionClassName} ${isSelected ? categorySelectSelectedOptionClassName : ""}`}
      >
        <CategoryName id={node.id} customName={node.name} color={node.color} />

        {hasChildren && (
          <Icon
            icon="iconoir:nav-arrow-right"
            aria-hidden="true"
            className={`size-5 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
        )}

        {!hasChildren && isSelected && (
          <Icon
            icon="iconoir:check"
            aria-hidden="true"
            className="size-4 shrink-0 text-blue-600 dark:text-blue-400"
          />
        )}
      </button>

      {hasChildren && isExpanded && (
        <ul className={categorySelectChildrenClassName}>
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
