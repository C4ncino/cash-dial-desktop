import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeModal, toast } from "webcoreui";
import { useStore } from "zustand";

import PlanningForm from "@/components/Plannings/PlanningForm";
import { validatePlanningForm } from "@/lib/forms/planning";
import { accountsStore } from "@/stores/accountsStore";
import { categoryStore } from "@/stores/categoryStore";
import { currencyStore } from "@/stores/currencyStore";
import { editStore } from "@/stores/editStore";
import { planningsStore } from "@/stores/planningsStore";
import { ACCOUNT_TYPES, MODAL_ID, MOVEMENT_TYPES, PLANNINGS_RECURRING_TYPES } from "@/types/enums";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("webcoreui", () => ({
  closeModal: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid="icon" data-icon={icon} />,
}));

function getPlanningForm() {
  const form = document.getElementById(MODAL_ID.PLANNING.CREATE);
  if (!(form instanceof HTMLFormElement)) throw new Error("Planning form was not rendered");
  return form;
}

vi.mock("@/components/Forms/SelectCategories", () => ({
  default: ({ categoryId, onChange }: any) => (
    <fieldset>
      <label htmlFor="categoryId">Categoría</label>
      <select
        name="categoryId"
        id="categoryId"
        defaultValue={categoryId}
        onChange={(e: any) => onChange?.(Number(e.target.value))}
      >
        <option value="">Seleccionar</option>
        <option value="5">Gym</option>
      </select>
    </fieldset>
  ),
}));

const sampleAccount = {
  id: 1,
  name: "Checking",
  type: { id: ACCOUNT_TYPES.DEBIT, name: "Debit" },
  balance: 1000,
  currencyId: 1,
  isActive: true,
  creditInfo: null,
};

const sampleCreditAccount = {
  id: 2,
  name: "Credit Card",
  type: { id: ACCOUNT_TYPES.CREDIT, name: "Credit" },
  balance: -500,
  currencyId: 1,
  isActive: true,
  creditInfo: { cutoffDay: 15, daysToPay: 20 },
};

const mockUseStoreState = ({
  accounts = [sampleAccount, sampleCreditAccount],
  editState = {},
}: any = {}) => {
  vi.mocked(useStore).mockImplementation((store: any, selector: any) => {
    if (store === accountsStore) {
      return selector({ accounts });
    }
    if (store === editStore) {
      return selector({
        clear: vi.fn(),
        ...editState,
      });
    }
    if (store === categoryStore) {
      return selector({
        categories: [{ id: 5, fatherId: null, name: "Gym", icon: "gym", color: "#3b82f6" }],
        getById: (id: number) => ({
          id,
          name: "Gym",
          icon: "gym",
          color: "#3b82f6",
        }),
      });
    }
    if (store === planningsStore) {
      return selector({
        plannings: [],
        recurringTypes: [
          {
            id: 1,
            key: "daily",
            name: "Diario",
            singular: "día",
            plural: "días",
          },
          {
            id: 2,
            key: "weekly",
            name: "Semanal",
            singular: "semana",
            plural: "semanas",
          },
          {
            id: 3,
            key: "monthly",
            name: "Mensual",
            singular: "mes",
            plural: "meses",
          },
          {
            id: 4,
            key: "yearly",
            name: "Anual",
            singular: "año",
            plural: "años",
          },
        ],
        statuses: [],
        occurrencesByPlanning: {},
      });
    }
    if (store === currencyStore) {
      return selector({
        currencies: [{ id: 1, name: "Peso Mexicano", symbol: "$", code: "MXN" }],
      });
    }
    return undefined;
  });
};

describe("validatePlanningForm", () => {
  it("passes validation with valid monthly planning data", () => {
    const res = validatePlanningForm(
      "Internet",
      500,
      1,
      10,
      PLANNINGS_RECURRING_TYPES.MONTHLY,
      1,
      1770000000000,
      null,
      [],
      [15],
      [],
      MOVEMENT_TYPES.EXPENSE,
      false,
    );
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("fails validation when name is empty", () => {
    const res = validatePlanningForm(
      "",
      500,
      1,
      10,
      PLANNINGS_RECURRING_TYPES.MONTHLY,
      1,
      1770000000000,
      null,
      [],
      [15],
      [],
      MOVEMENT_TYPES.EXPENSE,
      false,
    );
    expect(res.valid).toBe(false);
    expect(res.errors).toContain("El nombre de la planificación es requerido");
  });

  it("fails validation when amount is 0 or negative", () => {
    const res = validatePlanningForm(
      "Internet",
      0,
      1,
      10,
      PLANNINGS_RECURRING_TYPES.MONTHLY,
      1,
      1770000000000,
      null,
      [],
      [15],
      [],
      MOVEMENT_TYPES.EXPENSE,
      false,
    );
    expect(res.valid).toBe(false);
    expect(res.errors).toContain("El monto debe ser un número mayor a 0");
  });

  it("fails validation when credit card account selects income", () => {
    const res = validatePlanningForm(
      "Salary",
      1000,
      2,
      10,
      PLANNINGS_RECURRING_TYPES.MONTHLY,
      1,
      1770000000000,
      null,
      [],
      [15],
      [],
      MOVEMENT_TYPES.INCOME,
      true,
    );
    expect(res.valid).toBe(false);
    expect(res.errors).toContain("Las cuentas de tarjeta de crédito solo permiten gastos");
  });

  it("fails validation when end date is before start date", () => {
    const res = validatePlanningForm(
      "Internet",
      500,
      1,
      10,
      PLANNINGS_RECURRING_TYPES.MONTHLY,
      1,
      1770000000000,
      1760000000000,
      [],
      [15],
      [],
      MOVEMENT_TYPES.EXPENSE,
      false,
    );
    expect(res.valid).toBe(false);
    expect(res.errors).toContain(
      "La fecha de finalización no puede ser anterior a la fecha de inicio",
    );
  });
});

describe("PlanningForm Component", () => {
  beforeEach(() => {
    mockUseStoreState();
    vi.clearAllMocks();
  });

  it("renders form inputs correctly", () => {
    render(<PlanningForm modalId={MODAL_ID.PLANNING.CREATE} />);

    expect(document.getElementById(MODAL_ID.PLANNING.CREATE)).toHaveClass(
      "w-full",
      "mx-auto",
      "p-4",
      "max-w-lg",
      "space-y-4",
    );

    expect(screen.getByLabelText("Nombre de la planificación")).toBeInTheDocument();
    expect(screen.getByLabelText("Monto Estimado")).toBeInTheDocument();
    expect(screen.getByText("Gasto")).toBeInTheDocument();
    expect(screen.getByText("Ingreso")).toBeInTheDocument();
  });

  it("restores default checked selections on reset", async () => {
    render(<PlanningForm modalId={MODAL_ID.PLANNING.CREATE} />);

    fireEvent.click(screen.getByRole("button", { name: "Ingreso" }));
    fireEvent.click(screen.getByRole("button", { name: "Diario" }));
    fireEvent.click(screen.getByLabelText(/Definir fecha de finalizaci.n/i));

    expect(screen.getByRole("button", { name: "Ingreso" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Diario" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(/Definir fecha de finalizaci.n/i)).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Gasto" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Mensual" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByLabelText(/Definir fecha de finalizaci.n/i)).not.toBeChecked();
    });
  });

  it("submits create planning payload on valid form submission", async () => {
    const createSpy = vi.spyOn(planningsStore.getState(), "create").mockResolvedValue({} as any);

    render(<PlanningForm modalId={MODAL_ID.PLANNING.CREATE} />);

    fireEvent.change(screen.getByLabelText("Nombre de la planificación"), {
      target: { value: "Suscripción Gym" },
    });
    fireEvent.change(screen.getByLabelText("Monto Estimado"), {
      target: { value: "350" },
    });

    const form = getPlanningForm();

    // Fill account select
    const accountSelect = screen.getByLabelText("Cuenta");
    fireEvent.change(accountSelect, { target: { value: "1" } });

    // Fill category select
    const categorySelect = screen.getByLabelText("Categoría");
    fireEvent.change(categorySelect, { target: { value: "5" } });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled();
    });
  });

  it("locks duplicate submissions, reports failure, and allows retry", async () => {
    let rejectFirst: (reason: Error) => void = () => undefined;
    const createSpy = vi
      .spyOn(planningsStore.getState(), "create")
      .mockReturnValueOnce(new Promise((_, reject) => (rejectFirst = reject)))
      .mockResolvedValueOnce({} as Planning);
    render(<PlanningForm modalId={MODAL_ID.PLANNING.CREATE} />);
    fireEvent.change(screen.getByLabelText("Nombre de la planificación"), {
      target: { value: "Gym" },
    });
    fireEvent.change(screen.getByLabelText("Monto Estimado"), { target: { value: "350" } });
    fireEvent.change(screen.getByLabelText("Cuenta"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "5" } });
    const form = getPlanningForm();

    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(createSpy).toHaveBeenCalledTimes(1);
    rejectFirst(new Error("temporary"));
    expect(
      await screen.findByText("Ocurrió un error al guardar la planificación"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre de la planificación")).toHaveValue("Gym");

    fireEvent.submit(form);
    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(2));
    expect(toast).toHaveBeenCalledTimes(1);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it("suppresses completion UI after unmount", async () => {
    let resolveCreate: (planning: Planning) => void = () => undefined;
    vi.spyOn(planningsStore.getState(), "create").mockReturnValueOnce(
      new Promise((resolve) => (resolveCreate = resolve)),
    );
    const { unmount } = render(<PlanningForm modalId={MODAL_ID.PLANNING.CREATE} />);
    fireEvent.change(screen.getByLabelText("Nombre de la planificación"), {
      target: { value: "Gym" },
    });
    fireEvent.change(screen.getByLabelText("Monto Estimado"), { target: { value: "350" } });
    fireEvent.change(screen.getByLabelText("Cuenta"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "5" } });
    fireEvent.submit(getPlanningForm());
    unmount();
    resolveCreate({} as Planning);
    await Promise.resolve();
    expect(toast).not.toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
  });
});
