// Label + control + error message wrapper, so every field in the form has the
// same spacing, the same error styling and the same accessibility wiring.
// Colours assume the dark forest panel the enquiry form sits on.
export default function FormField({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  className = "",
  children,
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-forest-100">
        {label}
        {required && (
          <span className="text-clay-300" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>

      <div className="mt-2">{children}</div>

      {hint && !error && <p className="mt-2 text-xs text-forest-300">{hint}</p>}

      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="mt-2 text-sm text-clay-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}
