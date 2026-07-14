interface Props {
  errors: string[];
}

const FormErrors = ({ errors }: Props) => {
  if (errors.length === 0) return null;

  return (
    <p className="text-red-500 text-sm">
      {errors.map((error) => (
        <span key={error}>{error}</span>
      ))}
    </p>
  );
};

export default FormErrors;
