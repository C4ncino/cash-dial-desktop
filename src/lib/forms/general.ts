export type FormDataRecord = Record<string, FormDataEntryValue>;

export interface FormValidationResult {
  valid: boolean;
  errors: string[];
}

export function validationResult(errors: string[]): FormValidationResult {
  return { valid: errors.length === 0, errors };
}
