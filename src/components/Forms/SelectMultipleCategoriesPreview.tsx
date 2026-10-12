import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";

import SelectCategories from "@/components/Forms/SelectCategories";
import SelectMultipleCategories from "@/components/Forms/SelectMultipleCategories";
import { categoryStore } from "@/stores/categoryStore";

export default function SelectMultipleCategoriesPreview() {
  const categories = useStore(categoryStore, (state) => state.categories);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [submittedIds, setSubmittedIds] = useState<number[] | null>(null);
  const [submittedCategoryId, setSubmittedCategoryId] = useState<string | null>(null);
  const defaultSelectionInitialized = useRef(false);

  useEffect(() => {
    if (!categories.length || defaultSelectionInitialized.current) return;
    setCategoryIds(categories.slice(0, 2).map((category) => category.id));
    defaultSelectionInitialized.current = true;
  }, [categories]);

  return (
    <section className="glass-surface rounded-xl p-4 sm:p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
        Temporary component preview
      </p>
      <h2 className="mb-4 text-lg font-semibold">Form selection comparison</h2>
      <form
        className="max-w-lg space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          setSubmittedIds(formData.getAll("categoryIds").map(Number));
          setSubmittedCategoryId(String(formData.get("categoryId") ?? ""));
        }}
      >
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Single select</h3>
          <SelectCategories categoryId={categoryId} onChange={setCategoryId} />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Multi select (default selection)</h3>
          <SelectMultipleCategories categoryIds={categoryIds} onChange={setCategoryIds} />
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Selected IDs: {categoryIds.length ? categoryIds.join(", ") : "none"}
        </p>
        <button
          type="button"
          className="focus-ring min-h-10 rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-200/60 dark:border-zinc-700 dark:hover:bg-zinc-800/60"
          onClick={() => setCategoryIds([])}
        >
          Clear multi selection
        </button>
        <button
          type="submit"
          className="focus-ring min-h-11 rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
        >
          Submit preview form
        </button>

        <button
          type="reset"
          className="focus-ring min-h-11 rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
        >
          Reset preview form
        </button>
        {submittedIds !== null && (
          <output className="block text-sm text-zinc-700 dark:text-zinc-300">
            Submitted single category: {submittedCategoryId || "none"}. Multi categories:{" "}
            {submittedIds.length ? submittedIds.join(", ") : "none"}
          </output>
        )}
      </form>
    </section>
  );
}
