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
  default: "border-zinc-400 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700",
  alert: "border-red-600 text-red-600 hover:bg-red-600 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-400",
  info: "border-blue-600 text-blue-600 hover:bg-blue-600 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400",
  success: "border-green-600 text-green-600 hover:bg-green-600 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-400",
  warning: "border-yellow-600 text-yellow-600 hover:bg-yellow-600 dark:border-yellow-400 dark:text-yellow-400 dark:hover:bg-yellow-400",
};

const ConfirmModal = ({
  buttonTitle,
  modalTitle,
  description,
  theme,
  buttonClassName = "",
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
        className="glass-elevated w-[calc(100vw-2rem)]! max-w-md! max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain backdrop-blur-md"
        title={modalTitle}
        showCloseIcon={false}
        closeOnEsc={false}
        closeOnOverlay={false}
        theme={theme}
      >
        <p className="mb-6 text-zinc-500 dark:text-zinc-400">{description}</p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => modalInstance?.close()}
            className="focus-ring min-h-11 rounded-lg border-2 border-zinc-400 px-4 py-2 text-zinc-700 hover:cursor-pointer hover:bg-zinc-200 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
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
            className={`focus-ring min-h-11 rounded-lg border-2 px-4 py-2 hover:text-zinc-50 dark:hover:text-zinc-950 ${CLASSES[theme || "default"]} hover:cursor-pointer`}
          >
            {buttonTitle}
          </button>
        </div>
      </Modal>
    </>
  );
};

export default ConfirmModal;
