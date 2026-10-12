import { Icon } from "@iconify/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";

import CategoryName from "@/components/General/CategoryName";
import { isTransferIcon } from "@/lib/icons";
import { categoryStore, getCategoriesTree, isCategoryInSubtree } from "@/stores/categoryStore";

import {
  categorySelectChildrenClassName,
  categorySelectMenuClassName,
  categorySelectOptionClassName,
  categorySelectSelectedOptionClassName,
  categorySelectTriggerClassName,
} from "./categorySelectStyles";

interface Props {
  categoryIds: number[];
  rootCategoryId?: number;
  onChange: (ids: number[]) => void;
}

type CategoryChoiceProps = {
  node: CategoryNode;
  selectedIds: number[];
  expandedParents: Record<number, boolean>;
  onToggleExpanded: (id: number) => void;
  onToggleSelected: (id: number) => void;
};

const CategoryChoice = ({
  node,
  selectedIds,
  expandedParents,
  onToggleExpanded,
  onToggleSelected,
}: CategoryChoiceProps) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedParents[node.id] ?? false;
  const isVirtualGeneral = node.name === "General";
  const isSelectable = !hasChildren || isVirtualGeneral;
  const isSelected = selectedIds.includes(node.id);

  return (
    <li className="rounded-md p-1">
        {isSelectable ? (
          <button
            type="button"
            aria-pressed={isSelected}
            className={`${categorySelectOptionClassName} ${isSelected ? categorySelectSelectedOptionClassName : ""}`}
            onClick={() => onToggleSelected(node.id)}
          >
            <CategoryName id={node.id} customName={node.name} color={node.color} />
            <Icon
              icon={isSelected ? "iconoir:check" : "iconoir:plus"}
              className={`size-4 shrink-0 ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-zinc-500 dark:text-zinc-400"}`}
              aria-hidden="true"
            />
          </button>
        ) : (
          <button
            type="button"
            aria-label={`${isExpanded ? "Contraer" : "Expandir"} ${node.name}`}
            aria-expanded={isExpanded}
            className={categorySelectOptionClassName}
            onClick={() => onToggleExpanded(node.id)}
          >
            <CategoryName id={node.id} customName={node.name} color={node.color} />
            <Icon
              icon="iconoir:nav-arrow-right"
              className={`size-5 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              aria-hidden="true"
            />
          </button>
        )}
      {hasChildren && !isVirtualGeneral && isExpanded && (
        <ul className={categorySelectChildrenClassName}>
          {node.children.map((child) => (
            <CategoryChoice
              key={`${node.id}-${child.id}-${child.name}`}
              node={child}
              selectedIds={selectedIds}
              expandedParents={expandedParents}
              onToggleExpanded={onToggleExpanded}
              onToggleSelected={onToggleSelected}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

const SelectMultipleCategories = ({ categoryIds, rootCategoryId, onChange }: Props) => {
  const { categories, getById } = useStore(categoryStore, (state) => state);
  const containerRef = useRef<HTMLFieldSetElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Record<number, boolean>>({});
  const categoryTree = useMemo(
    () => getCategoriesTree(categories, rootCategoryId),
    [categories, rootCategoryId],
  );
  const selectedIds = useMemo(() => [...new Set(categoryIds)], [categoryIds]);
  const selectedCategories = selectedIds
    .map((id) => getById(id))
    .filter((category): category is Category => category !== undefined);

  useEffect(() => {
    if (rootCategoryId === undefined || categories.length === 0) return;
    const validIds = selectedIds.filter((id) =>
      isCategoryInSubtree(categories, id, rootCategoryId),
    );
    if (validIds.length !== selectedIds.length) onChange(validIds);
  }, [categories, onChange, rootCategoryId, selectedIds]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const toggleSelected = (id: number) => {
    const nextIds = selectedIds.includes(id)
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id];
    onChange(nextIds);
  };

  const toggleExpanded = (id: number) => {
    setExpandedParents((previous) => ({ ...previous, [id]: !previous[id] }));
  };

  if (categories.length === 0) {
    return (
      <fieldset className="w-full space-y-1 font-sans" disabled>
        <legend className="text-zinc-700 dark:text-zinc-300">Categorías</legend>
        <p className="glass-control rounded-lg px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
          No hay categorías disponibles.
        </p>
      </fieldset>
    );
  }

  return (
    <fieldset
      ref={containerRef}
      className="relative w-full space-y-1 font-sans text-zinc-950 dark:text-zinc-100"
    >
      <legend className="text-zinc-700 dark:text-zinc-300">Categorías</legend>
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="categoryIds" value={id} readOnly />
      ))}
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={listId}
        className={categorySelectTriggerClassName}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && isOpen) {
            setIsOpen(false);
            triggerRef.current?.focus();
          }
        }}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {selectedCategories.length ? (
            selectedCategories.map((category) => (
              <span
                key={category.id}
                className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full bg-zinc-200 px-2 text-sm dark:bg-zinc-800"
              >
                <Icon
                  icon={`iconoir:${category.icon}`}
                  style={{ color: category.color }}
                  className={`size-4 shrink-0 ${isTransferIcon(category.icon) ? "rotate-90" : ""}`}
                  aria-hidden="true"
                />
                <span className="truncate">{category.name}</span>
              </span>
            ))
          ) : (
            <span className="text-zinc-500 dark:text-zinc-400">Seleccionar categorías</span>
          )}
        </span>
        <Icon
          icon="iconoir:nav-arrow-down"
          className={`size-5 shrink-0 text-zinc-500 transition-transform dark:text-zinc-400 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <ul
          id={listId}
          aria-label="Opciones de categoría"
          className={categorySelectMenuClassName}
        >
          {categoryTree.map((node) => (
            <CategoryChoice
              key={node.id}
              node={node}
              selectedIds={selectedIds}
              expandedParents={expandedParents}
              onToggleExpanded={toggleExpanded}
              onToggleSelected={toggleSelected}
            />
          ))}
        </ul>
      )}
    </fieldset>
  );
};

export default SelectMultipleCategories;
