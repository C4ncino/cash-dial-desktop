import { toast } from "webcoreui";
import { useStore } from "zustand";

import ConfirmModal from "@/components/Forms/ConfirmModal";
import { accountsStore } from "@/stores/accountsStore";
import { MODAL_ID } from "@/types/enums";

const ActionButtons = () => {
  const id =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("id"))
      : null;

  const account = useStore(accountsStore, (state) => state.accounts.find((item) => item.id === id));

  if (!account || id === null) return null;

  const isActive = account.isActive ?? true;

  return (
    <>
      <li>
        <ConfirmModal
          onConfirm={async () => {
            if (isActive) {
              await accountsStore.getState().deactivate(id);
              toast("#account-deactivated");
            } else {
              await accountsStore.getState().activate(id);
              toast("#account-activated");
            }
          }}
          buttonTitle={isActive ? "Desactivar" : "Activar"}
          modalId={isActive ? MODAL_ID.ACCOUNT.DEACTIVATE : MODAL_ID.ACCOUNT.ACTIVATE}
          modalTitle={isActive ? "Confirmar desactivación" : "Confirmar activación"}
          description={
            isActive
              ? "¿Estás seguro de que deseas desactivar esta cuenta? Ya no se podrán registrar movimientos nuevos, pero su historial permanecerá disponible."
              : "¿Estás seguro de que deseas activar esta cuenta? Podrá volver a usarse en movimientos y planificaciones."
          }
          theme={isActive ? "warning" : "success"}
          buttonTone={isActive ? "warning" : "success"}
          buttonFullWidth
        />
      </li>

      <li>
        <ConfirmModal
          onConfirm={async () => {
            await accountsStore.getState().remove(id);
            toast("#account-deleted");
            window.history.back();
          }}
          buttonTitle="Eliminar"
          modalId={MODAL_ID.ACCOUNT.DELETE}
          modalTitle="Confirmar eliminación"
          description="¿Estás seguro de que deseas eliminar esta cuenta? Esto eliminara todos los movimientos relacionados"
          theme="alert"
          buttonTone="danger"
          buttonFullWidth
        />
      </li>
    </>
  );
};

export default ActionButtons;
