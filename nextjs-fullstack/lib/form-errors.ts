/** The id of the error banner. Inputs named in an error point at it. */
export const FORM_ERROR_ID = "form-error";

/** Props for an input that the last failed post said was wrong. */
export function fieldErrorProps(invalid: ReadonlySet<string>, name: string) {
  return invalid.has(name)
    ? ({ "aria-invalid": true, "aria-describedby": FORM_ERROR_ID } as const)
    : {};
}
