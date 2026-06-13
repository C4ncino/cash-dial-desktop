import { useEffect, useState } from "react";
import { type ModalInstance, modal } from "webcoreui";
import { Modal } from "webcoreui/react";

interface Props {
  buttonTitle: string;
  modalTitle: string;
  modalId: string;
  description: string;
  theme: "alert" | "info" | "success" | "warning" | undefined;
  buttonClassName?: string;
  onConfirm: () => void;
}

const CLASSES = {
  default: "border-zinc-200 text-zinc-200 hover:bg-zinc-200",
  alert: "border-red-600 text-red-600 hover:bg-red-600",
  info: "border-blue-600 text-blue-600 hover:bg-blue-600",
  success: "border-green-600 text-green-600 hover:bg-green-600",
  warning: "border-yellow-600 text-yellow-600 hover:bg-yellow-600",
};

const ConfirmModal = ({
  buttonTitle,
  modalTitle,
  description,
  theme,
  buttonClassName,
  onConfirm,
  modalId,
}: Props) => {
  const [modalInstance, setModalInstance] = useState<ModalInstance | undefined>();

  useEffect(() => {
    setModalInstance(modal(`#${modalId}`));
  }, [modalId]);

  return (
    <>
      <button
        data-testid="open-modal-button"
        type="button"
        onClick={() => modalInstance?.open()}
        className={`cursor-pointer ${buttonClassName}`}
      >
        {buttonTitle}
      </button>

      <Modal
        id={modalId}
        className="w-md!"
        title={modalTitle}
        showCloseIcon={false}
        closeOnEsc={false}
        closeOnOverlay={false}
        theme={theme}
      >
        <p className="text-zinc-400 mb-6">{description}</p>
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => modalInstance?.close()}
            className="border-2 border-zinc-200 text-zinc-200 hover:text-black py-2 px-4 rounded hover:bg-zinc-200 hover:cursor-pointer"
          >
            Cancelar
          </button>
          <button
            data-testid="confirm-button"
            type="button"
            onClick={() => {
              onConfirm();
              modalInstance?.close();
            }}
            className={`border-2 hover:text-white py-2 px-4 rounded ${CLASSES[theme || "default"]} hover:cursor-pointer`}
          >
            {buttonTitle}
          </button>
        </div>
      </Modal>
    </>
  );
};

export default ConfirmModal;
