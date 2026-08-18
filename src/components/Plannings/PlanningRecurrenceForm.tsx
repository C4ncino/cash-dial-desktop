import { Icon } from "@iconify/react";
import { useMemo, useState } from "react";
import { Button, Input, Select } from "webcoreui/react";
import { useStore } from "zustand";

import { planningsStore } from "@/stores/planningsStore";
import { PLANNINGS_RECURRING_TYPES } from "@/types/enums";

const WEEKDAYS = [
  { id: 0, shortName: "Lun", fullName: "Lunes" },
  { id: 1, shortName: "Mar", fullName: "Martes" },
  { id: 2, shortName: "Mié", fullName: "Miércoles" },
  { id: 3, shortName: "Jue", fullName: "Jueves" },
  { id: 4, shortName: "Vie", fullName: "Viernes" },
  { id: 5, shortName: "Sáb", fullName: "Sábado" },
  { id: 6, shortName: "Dom", fullName: "Domingo" },
];

const MONTH_NAMES = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

const MONTH_DAYS_ARRAY = Array.from({ length: 28 }, (_, i) => i + 1);

function formatTimestampToDate(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateToTimestamp(dateStr: string): number {
  if (!dateStr) return Date.now();
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);
  return d.getTime();
}

interface Props {
  recurringTypeId: number;
  intervalStep: number;
  startDate: number;
  endDate?: number | null;
  weekDays: number[];
  monthDays: number[];
  yearDays: PlanningYearDay[];
  onRecurringTypeChange: (typeId: number) => void;
  onIntervalStepChange: (step: number) => void;
  onStartDateChange: (timestamp: number) => void;
  onEndDateChange: (timestamp: number | null) => void;
  onWeekDaysChange: (days: number[]) => void;
  onMonthDaysChange: (days: number[]) => void;
  onYearDaysChange: (days: PlanningYearDay[]) => void;
}

const PlanningRecurrenceForm = ({
  recurringTypeId,
  intervalStep,
  startDate,
  endDate,
  weekDays,
  monthDays,
  yearDays,
  onRecurringTypeChange,
  onIntervalStepChange,
  onStartDateChange,
  onEndDateChange,
  onWeekDaysChange,
  onMonthDaysChange,
  onYearDaysChange,
}: Props) => {
  const storeRecurringTypes = useStore(planningsStore, (s) => s?.recurringTypes) ?? [];

  const [hasEndDate, setHasEndDate] = useState<boolean>(endDate != null);
  const [newYearMonth, setNewYearMonth] = useState<number>(1);
  const [newYearDay, setNewYearDay] = useState<number>(1);

  const currentType = useMemo(() => {
    return (
      (storeRecurringTypes || []).find((t) => t.id === recurringTypeId) || {
        id: recurringTypeId,
        name: "Mensual",
        singular: "mes",
        plural: "meses",
      }
    );
  }, [storeRecurringTypes, recurringTypeId]);

  const toggleWeekDay = (dayId: number) => {
    if (weekDays.includes(dayId)) {
      onWeekDaysChange(weekDays.filter((d) => d !== dayId));
    } else {
      const updated = [...weekDays, dayId].sort((a, b) => a - b);
      onWeekDaysChange(updated);
    }
  };

  const toggleMonthDay = (day: number) => {
    if (monthDays.includes(day)) {
      onMonthDaysChange(monthDays.filter((d) => d !== day));
    } else {
      const updated = [...monthDays, day].sort((a, b) => a - b);
      onMonthDaysChange(updated);
    }
  };

  const addYearDay = () => {
    const exists = yearDays.some(
      (yd) => yd.month === newYearMonth && yd.dayOfMonth === newYearDay,
    );
    if (!exists) {
      const updated = [...yearDays, { month: newYearMonth, dayOfMonth: newYearDay }].sort(
        (a, b) => a.month - b.month || a.dayOfMonth - b.dayOfMonth,
      );
      onYearDaysChange(updated);
    }
  };

  const removeYearDay = (index: number) => {
    const updated = yearDays.filter((_, i) => i !== index);
    onYearDaysChange(updated);
  };

  const handleTypeSelect = (typeId: number) => {
    onRecurringTypeChange(typeId);
    // Automatically reset subform states that do not apply to the new type
    if (typeId !== PLANNINGS_RECURRING_TYPES.WEEKLY) {
      onWeekDaysChange([]);
    }
    if (typeId !== PLANNINGS_RECURRING_TYPES.MONTHLY) {
      onMonthDaysChange([]);
    }
    if (typeId !== PLANNINGS_RECURRING_TYPES.YEARLY) {
      onYearDaysChange([]);
    }
  };

  const availableRecurringTypes =
    storeRecurringTypes.length > 0
      ? storeRecurringTypes
      : [
          { id: 1, key: "daily", name: "Diario", singular: "día", plural: "días" },
          { id: 2, key: "weekly", name: "Semanal", singular: "semana", plural: "semanas" },
          { id: 3, key: "monthly", name: "Mensual", singular: "mes", plural: "meses" },
          { id: 4, key: "yearly", name: "Anual", singular: "año", plural: "años" },
        ];

  return (
    <div className="space-y-4 pt-2 border-t border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-300">Regla de Recurrencia</h3>

      {/* Recurrence Type Selector */}
      <fieldset className="flex border border-zinc-800 rounded bg-zinc-950">
        {availableRecurringTypes.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => handleTypeSelect(t.id)}
            className={`flex-1 py-2 text-sm text-center font-medium transition-colors cursor-pointer first:rounded-l last:rounded-r border-r last:border-0 border-zinc-800 ${
              recurringTypeId === t.id
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            {t.name}
          </button>
        ))}
      </fieldset>

      {/* Interval Step Input */}
      <fieldset className="space-y-1">
        <label htmlFor="intervalStep" className="text-gray-webui-text text-sm">
          Frecuencia
        </label>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">Cada</span>
          <Input
            type="number"
            id="intervalStep"
            name="intervalStep"
            min={1}
            step={1}
            value={String(intervalStep || 1)}
            onChange={(e) => onIntervalStepChange(Math.max(1, Number(e.target.value) || 1))}
            className="w-24!"
          />
          <span className="text-sm text-zinc-300 font-medium">
            {intervalStep > 1 ? currentType.plural : currentType.singular}
          </span>
        </div>
      </fieldset>

      {/* Type Specific Fields */}
      {recurringTypeId === PLANNINGS_RECURRING_TYPES.WEEKLY && (
        <fieldset className="space-y-2">
          <label className="text-gray-webui-text text-sm block">Días de la semana</label>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => {
              const isSelected = weekDays.includes(w.id);
              return (
                <button
                  type="button"
                  key={w.id}
                  onClick={() => toggleWeekDay(w.id)}
                  title={w.fullName}
                  className={`py-2 text-xs font-medium rounded border cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {w.shortName}
                </button>
              );
            })}
          </div>
          {weekDays.length === 0 && (
            <p className="text-xs text-amber-400">Selecciona al menos un día de la semana.</p>
          )}
        </fieldset>
      )}

      {recurringTypeId === PLANNINGS_RECURRING_TYPES.MONTHLY && (
        <fieldset className="space-y-2">
          <label className="text-gray-webui-text text-sm block">Días del mes (1 - 28)</label>
          <div className="grid grid-cols-7 gap-1">
            {MONTH_DAYS_ARRAY.map((d) => {
              const isSelected = monthDays.includes(d);
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleMonthDay(d)}
                  className={`py-1.5 text-xs font-medium rounded border cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          {monthDays.length === 0 && (
            <p className="text-xs text-amber-400">Selecciona al menos un día del mes.</p>
          )}
        </fieldset>
      )}

      {recurringTypeId === PLANNINGS_RECURRING_TYPES.YEARLY && (
        <fieldset className="space-y-3">
          <label className="text-gray-webui-text text-sm block">Fechas del año</label>
          <div className="flex items-center gap-2">
            <select
              aria-label="Mes"
              value={newYearMonth}
              onChange={(e) => setNewYearMonth(Number(e.target.value))}
              className="bg-zinc-950 border border-zinc-800 text-white text-sm rounded px-2.5 py-2 flex-1"
            >
              {MONTH_NAMES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Día"
              value={newYearDay}
              onChange={(e) => setNewYearDay(Number(e.target.value))}
              className="bg-zinc-950 border border-zinc-800 text-white text-sm rounded px-2.5 py-2 w-20"
            >
              {MONTH_DAYS_ARRAY.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addYearDay}
              className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-3 py-2 rounded cursor-pointer transition-colors"
            >
              Agregar
            </button>
          </div>

          {yearDays.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {yearDays.map((yd, idx) => {
                const monthLabel = MONTH_NAMES.find((m) => m.value === yd.month)?.label || "";
                return (
                  <span
                    key={`${yd.month}-${yd.dayOfMonth}`}
                    className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs px-2.5 py-1 rounded-full"
                  >
                    <span>
                      {yd.dayOfMonth} de {monthLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeYearDay(idx)}
                      className="text-zinc-400 hover:text-red-400 cursor-pointer"
                    >
                      <Icon icon="iconoir:cancel" className="w-3.5 h-3.5" />
                    </button>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-amber-400">Agrega al menos una fecha para la regla anual.</p>
          )}
        </fieldset>
      )}

      {/* Date Range: Start Date & Optional End Date */}
      <fieldset className="space-y-3 pt-2">
        <div>
          <Input
            type="date"
            name="startDate"
            label="Fecha de inicio"
            required
            value={formatTimestampToDate(startDate)}
            onChange={(e) => onStartDateChange(parseDateToTimestamp(e.target.value))}
          />
          <p className="text-xs text-zinc-500 mt-1">
            La primera ocurrencia será calculada en o después de esta fecha.
          </p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={hasEndDate}
              onChange={(e) => {
                const checked = e.target.checked;
                setHasEndDate(checked);
                if (!checked) {
                  onEndDateChange(null);
                } else {
                  // Default to 1 year after start date
                  const d = new Date(startDate);
                  d.setFullYear(d.getFullYear() + 1);
                  onEndDateChange(d.getTime());
                }
              }}
              className="rounded bg-zinc-950 border-zinc-800"
            />
            Definir fecha de finalización
          </label>

          {hasEndDate && (
            <Input
              type="date"
              name="endDate"
              label="Fecha límite"
              value={endDate ? formatTimestampToDate(endDate) : ""}
              onChange={(e) => onEndDateChange(parseDateToTimestamp(e.target.value))}
            />
          )}
        </div>
      </fieldset>
    </div>
  );
};

export default PlanningRecurrenceForm;
