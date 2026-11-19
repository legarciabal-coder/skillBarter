export default function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="error" role="alert">
      <strong>{error.message}</strong>
      {error.details?.length > 0 && (
        <ul>
          {error.details.map((d, i) => (
            <li key={i}>{d.path ? `${d.path}: ` : ''}{d.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
