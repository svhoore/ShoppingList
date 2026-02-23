import { useState } from 'react';

const ICONS = [
  // Shopping & Food
  '🛒', '🛍️', '🧺', '🥑', '🍎', '🍊', '🍋', '🍌',
  '🍇', '🍓', '🫐', '🍑', '🥦', '🥕', '🌽', '🥬',
  '🍞', '🥛', '🧀', '🥚', '🍕', '🍔', '🌮', '🍣',
  '🍗', '🥩', '🐟', '🍝', '☕', '🍷', '🍺', '🧃',
  '🍰', '🍫', '🍪', '🧁',
  // Household & Garden
  '🏠', '🧹', '🧼', '🧽', '💡', '🔧', '🪴', '🛁',
  '🪣', '🧴', '🛋️', '🛏️', '🪑', '🚿', '🗑️', '🌿',
  '🌸', '🌻', '🌳', '🪻',
  // Health & Beauty
  '💊', '🩹', '💉', '🩺', '🧴', '💅', '🪥', '🧻',
  // Pets & Animals
  '🐶', '🐱', '🐾', '🐰', '🐠', '🦜', '🐢',
  // Kids & Baby
  '👶', '🍼', '🧸', '🎒', '🖍️',
  // Car & Transport
  '🚗', '⛽', '🔋', '🛞',
  // Work & Office
  '💼', '📝', '📋', '📎', '📦', '🗂️', '💻', '🖨️',
  // Sports & Outdoors
  '⚽', '🏋️', '🚴', '🏕️', '🎣', '🏊',
  // General
  '⭐', '❤️', '💎', '🎁', '🎯', '🔥', '🎉', '✅',
  '📌', '🔔', '💰', '🏷️',
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-14 h-14 text-2xl bg-ios-bg rounded-xl flex items-center justify-center active:scale-95 transition-transform border-2 border-transparent focus:border-ios-blue/30"
        title="Pick icon"
      >
        {value}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border border-gray-200/80 p-3 w-72 max-h-72 overflow-y-auto">
            <p className="text-xs font-medium text-ios-secondary mb-2 px-1">Choose an icon</p>
            <div className="grid grid-cols-8 gap-1">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => {
                    onChange(icon);
                    setOpen(false);
                  }}
                  className={`w-8 h-8 text-lg rounded-lg flex items-center justify-center transition-all ${
                    value === icon
                      ? 'bg-ios-blue/15 scale-110'
                      : 'hover:bg-gray-100 active:scale-90'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
