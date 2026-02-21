import { useRef, useState } from 'react';
import { IconX } from './Icons';

const MAX_SIZE = 128; // px — resize to this
const MAX_BYTES = 80_000; // ~80 KB max data URL

interface HouseholdIconPickerProps {
  currentIcon?: string;
  onSave: (dataUrl: string | null) => Promise<void>;
}

/** Resize an image file to a square thumbnail and return a base64 data URL */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Crop to center square
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      canvas.width = MAX_SIZE;
      canvas.height = MAX_SIZE;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, MAX_SIZE, MAX_SIZE);
      // Try JPEG first for smaller size, fall back to lower quality
      let quality = 0.8;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > MAX_BYTES && quality > 0.3) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(dataUrl);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export default function HouseholdIconPicker({ currentIcon, onSave }: HouseholdIconPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    try {
      const dataUrl = await resizeImage(file);
      setPreview(dataUrl);
    } catch {
      // ignore
    }
  }

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    try {
      await onSave(preview);
      setPreview(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    try {
      await onSave(null);
    } finally {
      setSaving(false);
    }
  }

  const displayIcon = preview || currentIcon;

  return (
    <div>
      <label className="block text-xs font-medium text-ios-secondary uppercase tracking-wide mb-2">
        Household Icon
      </label>
      <div className="flex items-center gap-3">
        {/* Icon preview */}
        <button
          onClick={() => fileRef.current?.click()}
          className="w-16 h-16 rounded-2xl bg-ios-bg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden active:bg-gray-200 transition-colors flex-shrink-0"
          title="Upload icon"
        >
          {displayIcon ? (
            <img src={displayIcon} alt="Household icon" className="w-full h-full object-cover rounded-2xl" />
          ) : (
            <span className="text-2xl">🏠</span>
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-1.5">
          {preview ? (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-ios-blue text-white text-sm font-medium disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setPreview(null)}
                className="px-3 py-1.5 rounded-lg bg-ios-bg text-ios-secondary text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="text-ios-blue text-sm font-medium"
              >
                {currentIcon ? 'Change' : 'Upload'}
              </button>
              {currentIcon && (
                <button
                  onClick={handleRemove}
                  disabled={saving}
                  className="text-ios-red text-sm font-medium flex items-center gap-0.5 disabled:opacity-40"
                >
                  <IconX size={14} /> Remove
                </button>
              )}
            </div>
          )}
          <p className="text-[11px] text-ios-secondary">Square image, auto-resized to 128×128</p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
