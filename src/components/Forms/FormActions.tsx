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
          className="rounded border-2 border-zinc-400 px-4 py-2 text-zinc-700 hover:cursor-pointer hover:bg-zinc-200 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          {resetLabel}
        </button>
      </li>
      <li>
        <button
          type="submit"
          disabled={disabled}
          className="rounded border-2 border-green-600 bg-green-600 px-4 py-2 text-zinc-50 hover:cursor-pointer hover:border-green-500 hover:bg-green-500 dark:border-green-400 dark:bg-green-400 dark:text-zinc-950 dark:hover:border-green-500 dark:hover:bg-green-500"
        >
          {disabled ? "Guardando…" : submitLabel}
        </button>
      </li>
    </menu>
  );
};

export default FormActions;
