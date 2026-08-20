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
    <menu className="flex justify-end gap-3" aria-busy={disabled}>
      <li>
        <button
          type="reset"
          disabled={disabled}
          className="border-2 border-zinc-200 text-zinc-200 hover:text-black py-2 px-4 rounded hover:bg-zinc-200 hover:cursor-pointer"
        >
          {resetLabel}
        </button>
      </li>
      <li>
        <button
          type="submit"
          disabled={disabled}
          className="border-2 border-green-600 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 hover:border-green-700 hover:cursor-pointer"
        >
          {disabled ? "Guardando…" : submitLabel}
        </button>
      </li>
    </menu>
  );
};

export default FormActions;
