import { Icon } from "@iconify/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Breadcrumb } from "webcoreui/react";
import { useStore } from "zustand";

import { isTransferIcon } from "@/lib/icons";
import { categoryStore, getCategoriesTree, isCategoryInSubtree } from "@/stores/categoryStore";

import CategoryItem from "./CategoryItem";
import { categorySelectMenuClassName, categorySelectTriggerClassName } from "./categorySelectStyles";

interface Props {
  categoryId?: number;
  rootCategoryId?: number;
  onChange?: (id: number) => void;
}

interface Item {
  icon?: string;
  label?: string;
  href?: string;
  target?: "_self" | "_blank" | "_parent" | "_top" | "_unfencedTop";
}

const SelectCategories = ({ categoryId, rootCategoryId, onChange }: Props) => {
  const { categories, getById } = useStore(categoryStore, (state) => state);

  const dropdownRef = useRef<HTMLFieldSetElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Record<number, boolean>>({});
  const [selectedId, setSelectedId] = useState<number | undefined>();

  const selectionPath = useMemo(() => {
    if (!selectedId) return [];

    let category = getById(selectedId);

    const list: Item[] = [];
    const expanded: Record<number, boolean> = {};

    while (category) {
      list.unshift({ label: category.name });

      if (category.fatherId) {
        expanded[category.fatherId] = true;
        category = getById(category.fatherId);
      } else category = undefined;
    }

    setExpandedParents(expanded);

    return list;
  }, [selectedId, getById]);

  const selectedCategory = selectedId ? getById(selectedId) : undefined;

  useEffect(() => {
    if (categories.length > 0) {
      if (categoryId) {
        if (rootCategoryId && !isCategoryInSubtree(categories, categoryId, rootCategoryId)) {
          setSelectedId(undefined);
        } else {
          setSelectedId(categoryId);
        }
      } else {
        setSelectedId(undefined);
      }
    }
  }, [categoryId, categories, rootCategoryId]);

  useEffect(() => {
    if (rootCategoryId && selectedId) {
      if (!isCategoryInSubtree(categories, selectedId, rootCategoryId)) {
        setSelectedId(undefined);
        if (onChange) {
          onChange(undefined as unknown as number);
        }
      }
    }
  }, [rootCategoryId, categories, selectedId, onChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const categoryTree = useMemo(
    () => getCategoriesTree(categories, rootCategoryId),
    [categories, rootCategoryId],
  );

  if (categories.length === 0) return null;

  const onSelect = (id: number) => {
    setSelectedId(id);

    setIsOpen(false);

    if (onChange) {
      onChange(id);
    }
  };

  const toggleParent = (id: number) => {
    setExpandedParents((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <fieldset
      className="relative w-full font-sans text-zinc-950 dark:text-zinc-100"
      ref={dropdownRef}
    >
      <label htmlFor="categoryId" className="text-zinc-700 dark:text-zinc-300">
        Categoría
      </label>

      <input hidden readOnly id="categoryId" name="categoryId" value={selectedId ?? ""} />

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={categorySelectTriggerClassName}
      >
        {selectedCategory ? (
          <span className="flex items-center gap-2 flex-no-wrap overflow-hidden">
            <Icon
              icon={`iconoir:${selectedCategory.icon}`}
              style={{ color: selectedCategory.color }}
              className={`size-5 shrink-0 ${isTransferIcon(selectedCategory.icon) ? "rotate-90" : ""}`}
            />

            <Breadcrumb
              items={selectionPath}
              className="flex! flex-row! flex-nowrap! overflow-hidden! breadcrumb-category"
            />
          </span>
        ) : (
          <p className="text-zinc-500 dark:text-zinc-400">Seleccionar Categoría</p>
        )}
        <Icon
          icon="iconoir:nav-arrow-down"
          className={`size-5 shrink-0 text-zinc-500 transition-transform duration-200 dark:text-zinc-400 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <ul className={categorySelectMenuClassName}>
          {categoryTree.map((node) => (
            <CategoryItem
              key={node.id}
              node={node}
              expandedParents={expandedParents}
              selectedId={selectedId}
              onToggle={toggleParent}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </fieldset>
  );
};

export default SelectCategories;
