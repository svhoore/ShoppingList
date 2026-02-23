interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: 'red' | 'blue';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  confirmColor = 'red',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl w-full max-w-[280px] overflow-hidden shadow-xl">
        <div className="px-6 pt-5 pb-4 text-center">
          <h3 className="text-[17px] font-semibold text-ios-text">{title}</h3>
          <p className="mt-1 text-[13px] text-ios-secondary">{message}</p>
        </div>
        <div className="border-t border-gray-200 flex">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-[17px] text-ios-blue font-normal border-r border-gray-200 active:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 text-[17px] font-semibold active:bg-gray-100 transition-colors ${
              confirmColor === 'blue' ? 'text-ios-blue' : 'text-ios-red'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
