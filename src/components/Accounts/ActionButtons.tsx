import ConfirmModal from "@/components/Forms/ConfirmModal";
import { logger } from "@/lib/logger";
import { accountsStore } from "@/stores/accountsStore";
import { MODAL_ID } from "@/types/enums";

const ActionButtons = () => {
  const id =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("id"))
      : null;

  return (
    <>
      <li>
        <ConfirmModal
          onConfirm={() => {
            logger.debug("Deactivate account id:", id);
          }}
          buttonTitle="Desactivar"
          modalId={MODAL_ID.ACCOUNT.DEACTIVATE}
          modalTitle="Confirmar desactivación"
          description="¿Estás seguro de que deseas desactivar esta cuenta? Ya no se podrá registrar movimientos en esta cuenta, pero los movimientos existentes no se eliminaran"
          theme="warning"
          buttonClassName="focus-ring min-h-10 rounded-lg border border-amber-600 text-sm font-medium text-amber-600 dark:border-amber-400 dark:text-amber-400 px-4 py-2 cursor-pointer"
        />
      </li>

      <li>
        <ConfirmModal
          onConfirm={async () => {
            accountsStore.getState().remove(Number(id));
            window.history.back();
          }}
          buttonTitle="Eliminar"
          modalId={MODAL_ID.ACCOUNT.DELETE}
          modalTitle="Confirmar eliminación"
          description="¿Estás seguro de que deseas eliminar esta cuenta? Esto eliminara todos los movimientos relacionados"
          theme="alert"
          buttonClassName="focus-ring min-h-10 rounded-lg border border-red-600 text-sm font-medium text-red-600 dark:border-red-400 dark:text-red-400 w-full h-full px-4 py-2 cursor-pointer"
        />
      </li>
    </>
  );
};

export default ActionButtons;
