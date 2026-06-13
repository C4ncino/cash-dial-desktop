import ConfirmModal from "@/components/Forms/ConfirmModal";
import { accountsStore } from "@/stores/accountsStore";
import { MODAL_ID } from "@/types/enums";

const ActionButtons = () => {
  const id =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("id"))
      : null;

  if (!id) return;

  return (
    <>
      <li className="text-sm">
        <ConfirmModal
          onConfirm={() => {
            console.log(id);
          }}
          buttonTitle="Desactivar"
          modalId={MODAL_ID.ACCOUNT.DEACTIVATE}
          modalTitle="Confirmar desactivación"
          description="¿Estás seguro de que deseas desactivar esta cuenta? Ya no se podrá registrar movimientos en esta cuenta, pero los movimientos existentes no se eliminaran"
          theme="warning"
        />
      </li>
      <li className="text-sm">
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
        />
      </li>
    </>
  );
};

export default ActionButtons;
