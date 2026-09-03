import { useEffect, useState } from "react";
import { type ModalInstance, modal } from "webcoreui";
import { Modal } from "webcoreui/react";

import ActionButton from "@/components/General/ActionButton";
import type { ActionButtonTone } from "@/components/General/actionButtonStyles";

interface Props {
  buttonTitle: string;
  modalTitle: string;
  modalId: string;
  description: string;
  theme: "alert" | "info" | "success" | "warning" | undefined;
  buttonTone?: ActionButtonTone;
  buttonFullWidth?: boolean;
  buttonClassName?: string;
  onConfirm: () => void;
}

const CONFIRM_TONES: Record<NonNullable<Props["theme"]> | "default", ActionButtonTone> = {
  default: "default",
  alert: "danger",
  info: "info",
  success: "success",
  warning: "warning",
};

const ConfirmModal = ({
  buttonTitle,
  modalTitle,
  description,
  theme,
  buttonTone,
  buttonFullWidth = false,
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
      <ActionButton
        data-testid="open-modal-button"
        onClick={() => modalInstance?.open()}
        tone={buttonTone ?? CONFIRM_TONES[theme || "default"]}
        fullWidth={buttonFullWidth}
        className={buttonClassName}
      >
        {buttonTitle}
      </ActionButton>

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
          <ActionButton onClick={() => modalInstance?.close()} fullWidth className="sm:w-auto">
            Cancelar
          </ActionButton>
          <ActionButton
            data-testid="confirm-button"
            onClick={() => {
              onConfirm();
              modalInstance?.close();
            }}
            tone={CONFIRM_TONES[theme || "default"]}
            fullWidth
            className="sm:w-auto"
          >
            {buttonTitle}
          </ActionButton>
        </div>
      </Modal>
    </>
  );
};

export default ConfirmModal;
