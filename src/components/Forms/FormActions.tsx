interface Props {
  resetLabel?: string;
  submitLabel?: string;
}

const FormActions = ({ resetLabel = "Restaurar", submitLabel = "Guardar" }: Props) => {
  return (
    <menu className="flex justify-end gap-3">
      <li>
        <button
          type="reset"
          className="border-2 border-zinc-200 text-zinc-200 hover:text-black py-2 px-4 rounded hover:bg-zinc-200 hover:cursor-pointer"
        >
          {resetLabel}
        </button>
      </li>
      <li>
        <button
          type="submit"
          className="border-2 border-green-600 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 hover:border-green-700 hover:cursor-pointer"
        >
          {submitLabel}
        </button>
      </li>
    </menu>
  );
};

export default FormActions;
