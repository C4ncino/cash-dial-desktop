import { Icon } from "@iconify/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Breadcrumb } from "webcoreui/react";
import { useStore } from "zustand";

import { categoryStore, getCategoriesTree, isCategoryInSubtree } from "@/stores/categoryStore";

import CategoryItem from "./CategoryItem";

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
    <fieldset className="relative w-full text-white font-sans" ref={dropdownRef}>
      <label htmlFor="categoryId" className="text-gray-webui-text">
        Categoría
      </label>

      <input
        hidden
        readOnly
        id="categoryId"
        name="categoryId"
        value={selectedId ?? ""}
      />

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-left hover:bg-zinc-900 cursor-pointer transition-colors duration-200"
      >
        {selectedCategory ? (
          <span className="flex items-center gap-2 flex-no-wrap overflow-hidden">
            <Icon
              icon={`iconoir:${selectedCategory.icon}`}
              style={{ color: selectedCategory.color }}
              className="w-5 h-5"
            />

            <Breadcrumb
              items={selectionPath}
              className="flex! flex-row! flex-nowrap! overflow-hidden! breadcrumb-category"
            />
          </span>
        ) : (
          <p className="text-zinc-500">Seleccionar Categoría</p>
        )}
        <Icon
          icon="iconoir:nav-arrow-down"
          className={`w-5 h-5 text-zinc-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <ul className="absolute z-50 w-full max-h-72 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded shadow-xl scrollbar-thin scrollbar-thumb-zinc-800">
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
