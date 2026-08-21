interface Props {
  errors: string[];
}

const FormErrors = ({ errors }: Props) => {
  if (errors.length === 0) return null;

  return (
    <p className="text-sm text-red-600 dark:text-red-400">
      {errors.map((error) => (
        <span key={error}>{error}</span>
      ))}
    </p>
  );
};

export default FormErrors;
