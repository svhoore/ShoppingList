import { useState, type KeyboardEvent } from 'react';
import { DEFAULT_CATEGORIES } from '../hooks/useHousehold';
import { IconPlus, IconX } from './Icons';

interface CategoryPickerProps {
  value: string;
  onChange: (category: string) => void;
  customCategories?: string[];
  onAddCategory?: (name: string) => void;
}

export default function CategoryPicker({
  value, onChange, customCategories = [], onAddCategory,
}: CategoryPickerProps) {
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState('');

  const allCategories: string[] = [
    ...DEFAULT_CATEGORIES,
    ...customCategories.filter((c) => !(DEFAULT_CATEGORIES as readonly string[]).includes(c)),
  ];

  function handleAdd() {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (allCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      // Already exists — just select it
      onChange(allCategories.find((c) => c.toLowerCase() === trimmed.toLowerCase())!);
    } else {
      onAddCategory?.(trimmed);
      onChange(trimmed);
    }
    setNewCat('');
    setAdding(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setAdding(false);
      setNewCat('');
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {allCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(value === cat ? '' : cat)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              value === cat
                ? 'bg-ios-blue text-white'
                : 'bg-ios-bg text-ios-secondary active:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
        {/* Add new category button */}
        {onAddCategory && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 rounded-lg text-[13px] font-medium bg-ios-bg text-ios-blue active:bg-ios-blue/10 transition-colors flex items-center gap-1"
          >
            <IconPlus size={14} strokeWidth={2} />
            {allCategories.length === 0 ? 'Add category' : 'New'}
          </button>
        )}
      </div>

      {/* Inline add input */}
      {adding && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Category name…"
            autoFocus
            className="flex-1 px-3 py-2 bg-ios-bg rounded-xl text-ios-text text-[14px] placeholder:text-ios-secondary/40 focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newCat.trim()}
            className="px-3 py-2 rounded-xl bg-ios-blue text-white text-[13px] font-medium disabled:opacity-40"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setNewCat(''); }}
            className="p-1.5 rounded-lg text-ios-secondary active:bg-gray-100"
          >
            <IconX size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
