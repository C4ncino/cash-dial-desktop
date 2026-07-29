import { toast } from "webcoreui";
import { useStore } from "zustand";

import ConfirmModal from "@/components/Forms/ConfirmModal";
import { accountsStore } from "@/stores/accountsStore";
import { budgetStore } from "@/stores/budgetStore";
import { editStore } from "@/stores/editStore";
import { movementsStore } from "@/stores/movementsStore";
import { EDIT_TYPES, MODAL_ID, MOVEMENT_TYPES } from "@/types/enums";

const ActionButtons = () => {
  const id =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("id"))
      : null;

  const movement = useStore(movementsStore, (state) => (id ? state.byId[id] : undefined));

  if (!id || !movement) return null;

  const getDeleteConfig = () => {
    switch (movement.typeId) {
      case MOVEMENT_TYPES.INCOME:
        return {
          modalId: MODAL_ID.MOVEMENT.INCOME.DELETE,
          title: "Confirmar eliminación de ingreso",
          description:
            "¿Estás seguro de que deseas eliminar este ingreso? Esta acción no se puede deshacer.",
          toastId: "#income-deleted",
        };
      case MOVEMENT_TYPES.EXPENSE:
        return {
          modalId: MODAL_ID.MOVEMENT.EXPENSE.DELETE,
          title: "Confirmar eliminación de gasto",
          description:
            "¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.",
          toastId: "#expense-deleted",
        };
      case MOVEMENT_TYPES.TRANSFER:
        return {
          modalId: MODAL_ID.MOVEMENT.TRANSFER.DELETE,
          title: "Confirmar eliminación de transferencia",
          description:
            "¿Estás seguro de que deseas eliminar esta transferencia? Esta acción no se puede deshacer.",
          toastId: "#transfer-deleted",
        };
      default:
        return {
          modalId: "delete-movement-dialog",
          title: "Confirmar eliminación",
          description: "¿Estás seguro de que deseas eliminar este movimiento?",
          toastId: "",
        };
    }
  };

  const deleteConfig = getDeleteConfig();

  const handleConfirmDelete = async () => {
    await movementsStore.getState().remove(movement.id);

    budgetStore.getState().refreshAffected(movement.categoryId);
    // Also update account balance(s)
    accountsStore.getState().updateBalance(movement.accountId, movement.toAccountId);

    if (deleteConfig.toastId) {
      toast(deleteConfig.toastId);
    }

    window.history.back();
  };

  const handleEditClick = () => {
    let editType: EDIT_TYPES;
    let modalId: string;

    if (movement.typeId === MOVEMENT_TYPES.INCOME) {
      editType = EDIT_TYPES.INCOME;
      modalId = MODAL_ID.MOVEMENT.INCOME.EDIT;
    } else if (movement.typeId === MOVEMENT_TYPES.EXPENSE) {
      editType = EDIT_TYPES.EXPENSE;
      modalId = MODAL_ID.MOVEMENT.EXPENSE.EDIT;
    } else if (movement.typeId === MOVEMENT_TYPES.TRANSFER) {
      editType = EDIT_TYPES.TRANSFER;
      modalId = MODAL_ID.MOVEMENT.TRANSFER.EDIT;
    } else {
      return;
    }

    editStore.getState().setId(id, editType);

    window.dispatchEvent(
      new CustomEvent("modal:open", {
        detail: {
          id: modalId,
        },
      }),
    );
  };

  return (
    <menu className="flex flex-col gap-3">
      <li className="text-sm">
        <button
          type="button"
          className="edit-button hover:cursor-pointer w-full text-left py-2 px-4 font-medium text-white"
          onClick={handleEditClick}
        >
          Editar
        </button>
      </li>
      <li className="text-sm">
        <ConfirmModal
          onConfirm={handleConfirmDelete}
          buttonTitle="Eliminar"
          modalId={deleteConfig.modalId}
          modalTitle={deleteConfig.title}
          description={deleteConfig.description}
          theme="alert"
          buttonClassName="w-full text-left py-2 px-4 rounded text-red-500 font-medium cursor-pointer"
        />
      </li>
    </menu>
  );
};

export default ActionButtons;
