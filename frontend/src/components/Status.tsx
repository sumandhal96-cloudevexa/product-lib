export function Loading() {
  return (
    <p role="status" className="status">
      Loading…
    </p>
  );
}

export function ErrorMessage({ error }: { error: Error }) {
  return (
    <p role="alert" className="status status--error">
      {error.message}
    </p>
  );
}
