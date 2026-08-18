import { Icon } from "@iconify/react";
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import { useMemo, useState } from "react";
import { Pie } from "react-chartjs-2";

import CategoryName from "@/components/General/CategoryName";
import { StatisticsSectionSkeleton } from "@/components/Statistics/StatisticsSkeleton";
import { useStatisticsSection } from "@/hooks/useStatisticsSection";

ChartJS.register(ArcElement, Tooltip, Legend);

type DisplayedCategory = {
  category: StatisticsCategoryNode;
  path: number[];
};

type CategoriesListProps = {
  categories?: StatisticsCategoryNode[];
  symbol?: string;
};

const COLORS = [
  "#304FFE", // Blue
  "#00BFA5", // Teal
  "#7C4DFF", // Violet
  "#00A9E8", // Cyan-blue
  "#5E35B1", // Deep purple
  "#00E5A0", // Cool green
  "#4169FF", // Royal blue
  "#00B8D4", // Cyan
  "#8E7CFF", // Light violet
  "#45D6A5", // Mint green
];

const categoryColor = (path: number[]) => {
  const value = path.reduce((total, id) => total + Math.abs(id), 0);

  return COLORS[value % COLORS.length];
};

const hasNavigableChildren = (category: StatisticsCategoryNode) =>
  category.children.some((child) => !child.isVirtual);

const withOpacity = (hex: string, opacity: number) => {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};

const visibleCategories = (
  categories: StatisticsCategoryNode[],
  expandedPath: number[],
  prefix: number[] = [],
): DisplayedCategory[] => {
  const selectedId = expandedPath[0];
  const displayed: DisplayedCategory[] = [];
  const categoriesToRender = prefix.length
    ? categories
    : [...categories].sort((left, right) => right.percentOfTotal - left.percentOfTotal);

  for (const category of categoriesToRender) {
    const path = [...prefix, category.categoryId];
    if (category.categoryId === selectedId && hasNavigableChildren(category)) {
      if (expandedPath.length === 1) {
        displayed.push(
          ...category.children.map((child) => ({
            category: child,
            path: [...path, child.categoryId],
          })),
        );
      } else {
        displayed.push(...visibleCategories(category.children, expandedPath.slice(1), path));
      }
    } else {
      displayed.push({ category, path });
    }
  }

  return displayed;
};

const CategoriesList = ({
  categories: categoriesProp,
  symbol: symbolProp,
}: CategoriesListProps = {}) => {
  const { response, loading, symbol: storeSymbol } = useStatisticsSection();
  const [expandedPath, setExpandedPath] = useState<number[]>([]);

  const categories = categoriesProp ?? response?.categories.byCategoryHierarchy;
  const availableCategories = categories ?? [];
  const symbol = symbolProp ?? storeSymbol ?? "";

  const displayedCategories = useMemo(
    () => visibleCategories(availableCategories, expandedPath),
    [availableCategories, expandedPath],
  );

  const colorsByPath = useMemo(() => {
    const sortedCategories = [...displayedCategories].sort(
      (left, right) => right.category.percentOfTotal - left.category.percentOfTotal,
    );

    return new Map(
      sortedCategories.map(({ path }, index) => [path.join("/"), COLORS[index % COLORS.length]]),
    );
  }, [displayedCategories]);

  const colorForPath = (path: number[]) => colorsByPath.get(path.join("/")) ?? categoryColor(path);

  const expandedCategory = useMemo(() => {
    let current: StatisticsCategoryNode | undefined;
    let level = availableCategories;

    for (const id of expandedPath) {
      current = level.find((category) => category.categoryId === id);
      if (!current) return undefined;
      level = current.children;
    }

    return current;
  }, [availableCategories, expandedPath]);

  const data = useMemo(
    () => ({
      labels: displayedCategories.map(({ category }) => category.name),
      datasets: [
        {
          data: displayedCategories.map(({ category }) => category.amount),
          backgroundColor: displayedCategories.map(({ path }) => {
            const isActiveBranch = expandedPath.every((id, pathIndex) => path[pathIndex] === id);
            const color = colorForPath(path);
            return expandedPath.length && !isActiveBranch ? withOpacity(color, 0.3) : color;
          }),
          borderWidth: 1,
        },
      ],
    }),
    [colorsByPath, displayedCategories, expandedPath],
  );

  if (loading) return <StatisticsSectionSkeleton ariaLabel="Categorías" className="h-56" />;

  return (
    <section
      aria-label="Categorías"
      className="rounded-md border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Gastos por categoría</h2>
        {expandedPath.length > 0 && (
          <button
            type="button"
            aria-label="Restablecer selección de categoría"
            onClick={() => setExpandedPath([])}
            className="rounded border px-2 py-1 text-sm text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Restablecer
          </button>
        )}
      </header>

      {expandedCategory && (
        <div className="mb-3 flex items-center justify-between rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: colorForPath(expandedPath) }}
            />
            <span className="font-medium">{expandedCategory.name}</span>
            <span className="opacity-60">expandida</span>
          </div>
          <button
            type="button"
            aria-label={`Contraer ${expandedCategory.name}`}
            title={`Contraer ${expandedCategory.name}`}
            className="flex h-6 w-6 items-center justify-center rounded text-lg leading-none opacity-70 hover:bg-zinc-200 hover:opacity-100 dark:hover:bg-zinc-800"
            onClick={() => setExpandedPath(expandedPath.slice(0, -1))}
          >
            <Icon icon="iconoir:xmark" className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {displayedCategories.length ? (
        <div className="grid items-center gap-4 sm:grid-cols-2">
          <div>
            <Pie
              data={data}
              options={{
                responsive: true,
                onClick: (_event, elements) => {
                  const index = elements[0]?.index;
                  const selected = index === undefined ? undefined : displayedCategories[index];
                  if (selected && hasNavigableChildren(selected.category)) {
                    setExpandedPath(selected.path);
                  }
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: (item) => `${item.label}: ${symbol}${Number(item.raw).toFixed(2)}`,
                    },
                  },
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </div>

          <ul className="space-y-2">
            {displayedCategories.map(({ category, path }) => {
              const isActiveBranch = expandedPath.every((id, pathIndex) => path[pathIndex] === id);
              const canExpand = hasNavigableChildren(category);
              const isExpanded = path.length === expandedPath.length && isActiveBranch && canExpand;
              const color = colorForPath(path);
              const displayColor =
                expandedPath.length && !isActiveBranch ? withOpacity(color, 0.6) : color;

              return (
                <li key={path.join("/")}>
                  <button
                    type="button"
                    aria-expanded={canExpand ? isExpanded : undefined}
                    className={`flex w-full items-center justify-between gap-3 text-left ${canExpand ? "cursor-pointer" : "cursor-default"} ${expandedPath.length && !isActiveBranch ? "text-zinc-400 dark:text-zinc-500" : ""}`}
                    onClick={() => canExpand && setExpandedPath(path)}
                  >
                    <span>
                      <CategoryName
                        id={category.categoryId}
                        parentId={category.parentId ?? undefined}
                        customName={category.isVirtual ? category.name : undefined}
                        color={displayColor}
                        fallbackName={category.name}
                      />
                      {canExpand && <small className="ml-2 opacity-60">Detalles</small>}
                    </span>

                    <span className="text-right">
                      <strong>
                        {symbol}
                        {category.amount.toFixed(2)}
                      </strong>
                      <small className="ml-2 opacity-70">
                        {category.percentOfTotal.toFixed(1)}%
                      </small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="opacity-70">No hay gastos categorizados.</p>
      )}
    </section>
  );
};

export default CategoriesList;
