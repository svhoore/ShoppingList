import { type FormEvent, type ReactNode } from 'react';
import IconPicker from './IconPicker';
import CategoryPicker from './CategoryPicker';

interface ListFormModalProps {
  title: string;
  name: string;
  onNameChange: (value: string) => void;
  icon: string;
  onIconChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  customCategories?: string[];
  onAddCategory: (name: string) => Promise<void>;
  placeholder?: string;
  previewFallback?: string;
  submitting: boolean;
  submitLabel: [busy: string, idle: string];
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
  /** Extra content rendered between category picker and buttons (e.g. bonus toggle) */
  children?: ReactNode;
}

/** Shared add / rename modal for shopping-lists and action-lists. */
export default function ListFormModal({
  title,
  name,
  onNameChange,
  icon,
  onIconChange,
  category,
  onCategoryChange,
  customCategories,
  onAddCategory,
  placeholder,
  previewFallback = 'List name',
  submitting,
  submitLabel,
  onSubmit,
  onClose,
  children,
}: ListFormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={onSubmit}
        className="relative bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-ios-text mb-3">{title}</h3>
        <div className="flex items-center gap-3">
          <IconPicker value={icon} onChange={onIconChange} />
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={placeholder}
            autoFocus
            maxLength={60}
            className="flex-1 px-4 py-3 bg-ios-bg rounded-xl text-ios-text text-[16px] placeholder:text-ios-secondary/50 focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
          />
        </div>
        <div className="mt-2 text-xs text-ios-secondary flex items-center gap-2">
          <span className="text-base leading-none">{icon}</span>
          <span className="truncate">
            {(name.trim() || previewFallback)}{category ? ` · ${category}` : ''}
          </span>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-ios-secondary uppercase tracking-wide mb-2">Category</label>
          <CategoryPicker
            value={category}
            onChange={onCategoryChange}
            customCategories={customCategories}
            onAddCategory={onAddCategory}
          />
        </div>
        {children}
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-ios-blue font-medium bg-ios-bg active:bg-gray-200 transition-all active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="flex-1 py-2.5 rounded-xl bg-ios-blue text-white font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            {submitting ? submitLabel[0] : submitLabel[1]}
          </button>
        </div>
      </form>
    </div>
  );
}
