import { Icon } from "@iconify/react";
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import { useMemo, useState } from "react";
import { Pie } from "react-chartjs-2";

import CategoryName from "@/components/General/CategoryName";
import { StatisticsSectionSkeleton } from "@/components/Statistics/StatisticsSkeleton";
import { useStatisticsSection } from "@/hooks/useStatisticsSection";
import { formatStatMoney } from "@/lib/formatters";

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
  "#7B9FE8", // Powder blue
  "#72C7B8", // Mint
  "#A78BDA", // Lavender
  "#E7A977", // Peach
  "#D98FA6", // Blush pink
  "#6FB5D4", // Pastel sky
  "#8FC58A", // Sage green
  "#D9C46C", // Butter yellow
  "#C58AC7", // Soft orchid
  "#E38D7B", // Pastel coral
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
    <section aria-label="Categorías" className="glass-surface rounded-xl p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Gastos por categoría</h2>
        {expandedPath.length > 0 && (
          <button
            type="button"
            aria-label="Restablecer selección de categoría"
            onClick={() => setExpandedPath([])}
            className="rounded border px-2 py-1 text-sm text-blue-600 hover:bg-zinc-100 dark:text-blue-400 dark:hover:bg-zinc-800"
          >
            Restablecer
          </button>
        )}
      </header>

      {expandedCategory && (
        <div className="glass-control mb-3 flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: colorForPath(expandedPath) }}
            />
            <span className="truncate font-medium">{expandedCategory.name}</span>
            <span className="hidden opacity-60 sm:inline">expandida</span>
          </div>
          <button
            type="button"
            aria-label={`Contraer ${expandedCategory.name}`}
            title={`Contraer ${expandedCategory.name}`}
            className="focus-ring flex size-10 shrink-0 items-center justify-center rounded-lg text-lg leading-none opacity-70 hover:bg-zinc-200 hover:opacity-100 dark:hover:bg-zinc-800"
            onClick={() => setExpandedPath(expandedPath.slice(0, -1))}
          >
            <Icon icon="iconoir:xmark" className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {displayedCategories.length ? (
        <div className="grid min-w-0 items-center gap-6 lg:grid-cols-[minmax(16rem,0.9fr)_minmax(18rem,1.1fr)]">
          <div className="relative mx-auto aspect-square w-full max-w-xs">
            <Pie
              data={data}
              options={{
                responsive: true,
                maintainAspectRatio: false,
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
                      label: (item) => `${item.label}: ${formatStatMoney(Number(item.raw), symbol)}`,
                    },
                  },
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </div>

          <ul className="mx-auto w-full max-w-md space-y-2 lg:justify-self-center">
            {displayedCategories.map(({ category, path }) => {
              const isActiveBranch = expandedPath.every((id, pathIndex) => path[pathIndex] === id);
              const canExpand = hasNavigableChildren(category);
              const isExpanded = path.length === expandedPath.length && isActiveBranch && canExpand;
              const color = colorForPath(path);
              const displayColor =
                expandedPath.length && !isActiveBranch ? withOpacity(color, 0.6) : color;

              const rowContent = (
                <>
                  <span className="min-w-0 truncate">
                    <CategoryName
                      id={category.categoryId}
                      parentId={category.parentId ?? undefined}
                      customName={category.isVirtual ? category.name : undefined}
                      color={displayColor}
                      fallbackName={category.name}
                    />
                    {canExpand && <small className="ml-2 opacity-60">Detalles</small>}
                  </span>
                  <span className="grid grid-cols-[minmax(5.5rem,auto)_3.5rem] items-baseline gap-2 text-right tabular-nums">
                    <strong>{formatStatMoney(category.amount, symbol)}</strong>
                    <small className="opacity-70">{category.percentOfTotal.toFixed(1)}%</small>
                  </span>
                </>
              );

              return (
                <li key={path.join("/")}>
                  {canExpand ? (
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      className={`focus-ring grid min-h-10 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-lg text-left ${expandedPath.length && !isActiveBranch ? "text-zinc-500 dark:text-zinc-400" : ""}`}
                      onClick={() => setExpandedPath(path)}
                    >
                      {rowContent}
                    </button>
                  ) : (
                    <div
                      className={`grid min-h-10 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 ${expandedPath.length && !isActiveBranch ? "text-zinc-500 dark:text-zinc-400" : ""}`}
                    >
                      {rowContent}
                    </div>
                  )}
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
