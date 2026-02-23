interface ErrorToastProps {
  error: string | null;
  className?: string;
}

export default function ErrorToast({ error, className = 'bottom-20' }: ErrorToastProps) {
  if (!error) return null;
  return (
    <div className={`fixed ${className} left-4 right-4 z-40 bg-ios-red text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg text-center`}>
      {error}
    </div>
  );
}
