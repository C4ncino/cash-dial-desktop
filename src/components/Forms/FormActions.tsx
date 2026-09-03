interface Props {
  resetLabel?: string;
  submitLabel?: string;
  disabled?: boolean;
}

const FormActions = ({
  resetLabel = "Restaurar",
  submitLabel = "Guardar",
  disabled = false,
}: Props) => {
  return (
    <menu className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end" aria-busy={disabled}>
      <li>
        <ActionButton type="reset" disabled={disabled} className="w-full sm:w-auto">
          {resetLabel}
        </ActionButton>
      </li>
      <li>
        <ActionButton type="submit" disabled={disabled} tone="primary" className="w-full sm:w-auto">
          {disabled ? "Guardando…" : submitLabel}
        </ActionButton>
      </li>
    </menu>
  );
};

export default FormActions;

import ActionButton from "@/components/General/ActionButton";
