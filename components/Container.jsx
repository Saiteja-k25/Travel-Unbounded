// Keeps page width and horizontal padding consistent everywhere.
export default function Container({ children, className = "" }) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-6 ${className}`}>
      {children}
    </div>
  );
}
