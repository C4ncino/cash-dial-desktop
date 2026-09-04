import { Icon } from "@iconify/react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";

import ActionButton from "@/components/General/ActionButton";
import { requestMovementCreation } from "@/lib/movementCreation";
import { accountsStore } from "@/stores/accountsStore";
import { ACCOUNT_TYPES, MOVEMENT_TYPES } from "@/types/enums";

interface Props {
  accountContext?: boolean;
  fullWidth?: boolean;
}

const ACTIONS = [
  { typeId: MOVEMENT_TYPES.INCOME, label: "Añadir ingreso", icon: "iconoir:receive-dollars" },
  { typeId: MOVEMENT_TYPES.EXPENSE, label: "Añadir gasto", icon: "iconoir:send-dollars" },
  {
    typeId: MOVEMENT_TYPES.TRANSFER,
    label: "Añadir transferencia",
    icon: "iconoir:data-transfer-up",
  },
];

export default function CreateMovementMenu({ accountContext = false, fullWidth = false }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const accounts = useStore(accountsStore, (state) => state.accounts);
  const accountId = accountContext && typeof window !== "undefined"
    ? Number(new URLSearchParams(window.location.search).get("id"))
    : undefined;
  const account = accountContext ? accounts.find((item) => item.id === accountId) : undefined;

  useEffect(() => {
    if (!open) return;

    const closeFromOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    };

    document.addEventListener("click", closeFromOutside);
    document.addEventListener("keydown", closeFromKeyboard);
    return () => {
      document.removeEventListener("click", closeFromOutside);
      document.removeEventListener("keydown", closeFromKeyboard);
    };
  }, [open]);

  const disabledReason = (typeId: number) => {
    if (!accountContext) return undefined;
    if (!account) return "La cuenta no está disponible";
    if (!account.isActive) return "Activa la cuenta para registrar movimientos";
    if (typeId === MOVEMENT_TYPES.TRANSFER) {
      if (account.type.id === ACCOUNT_TYPES.CREDIT) {
        return "Las tarjetas de crédito no pueden ser cuenta origen de una transferencia";
      }
      if (!accounts.some((candidate) => candidate.isActive && candidate.id !== account.id)) {
        return "Se necesita otra cuenta activa para crear una transferencia";
      }
    }
    return undefined;
  };

  return (
    <div className={`relative ${fullWidth ? "w-full" : "w-auto"}`} ref={rootRef}>
      <ActionButton
        id="create-movement-menu-button"
        tone="primary"
        fullWidth={fullWidth}
        aria-haspopup="menu"
        aria-controls="create-movement-menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon icon="iconoir:plus" className="size-5" aria-hidden="true" />
        Añadir movimiento
        <Icon
          icon="iconoir:nav-arrow-down"
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </ActionButton>

      {open && (
        <div
          id="create-movement-menu"
          role="menu"
          aria-label="Crear movimiento"
          className="glass-elevated absolute right-0 z-30 mt-2 flex min-w-56 flex-col gap-2 rounded-xl p-2 shadow-xl"
        >
          {ACTIONS.map((action) => {
            const reason = disabledReason(action.typeId);
            return (
              <ActionButton
                key={action.typeId}
                id={`labeled-create-movement-${action.typeId}-button`}
                role="menuitem"
                fullWidth
                disabled={Boolean(reason)}
                title={reason}
                onClick={() => {
                  requestMovementCreation({
                    typeId: action.typeId,
                    accountId: accountContext ? account?.id : undefined,
                  });
                  setOpen(false);
                }}
              >
                <Icon icon={action.icon} className="size-5" aria-hidden="true" />
                {action.label}
              </ActionButton>
            );
          })}
        </div>
      )}
    </div>
  );
}
