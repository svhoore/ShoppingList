import { useState, useRef, type FormEvent } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import type { ActionPriority } from '../hooks/useHousehold';
import type { MemberInfo } from '../context/HouseholdContext';
import { IconX } from './Icons';

const PRIORITY_OPTIONS: { value: ActionPriority; label: string; icon: string; color: string; activeBg: string }[] = [
  { value: 'low',    label: 'Low',    icon: '🟢', color: 'text-ios-secondary', activeBg: 'bg-gray-100 ring-gray-300' },
  { value: 'medium', label: 'Medium', icon: '🔵', color: 'text-ios-blue',      activeBg: 'bg-ios-blue/10 ring-ios-blue/40' },
  { value: 'high',   label: 'High',   icon: '🟠', color: 'text-orange-600',    activeBg: 'bg-orange-50 ring-orange-400/40' },
  { value: 'urgent', label: 'Urgent', icon: '🔴', color: 'text-ios-red',       activeBg: 'bg-red-50 ring-ios-red/40' },
];

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ActionFormModalProps {
  title: string;
  submitLabel: string;
  formText: string;
  setFormText: (v: string) => void;
  formDescription: string;
  setFormDescription: (v: string) => void;
  formImageUrl: string;
  setFormImageUrl: (v: string) => void;
  formAssignees: string[];
  toggleAssignee: (uid: string) => void;
  formDueDate: string;
  setFormDueDate: (v: string) => void;
  formPriority: ActionPriority;
  setFormPriority: (v: ActionPriority) => void;
  members: { uid: string; info: MemberInfo }[];
  submitting: boolean;
  householdId: string;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

export default function ActionFormModal({
  title, submitLabel, formText, setFormText, formDescription, setFormDescription,
  formImageUrl, setFormImageUrl, formAssignees, toggleAssignee,
  formDueDate, setFormDueDate, formPriority, setFormPriority,
  members, submitting, householdId, onSubmit, onClose,
}: ActionFormModalProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImagePick(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError('Only JPG, PNG, or WebP images are allowed.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setUploadError('Image must be under 2 MB.');
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `households/${householdId}/actions/${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      setFormImageUrl(url);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={onSubmit}
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-5 pt-3 pb-1.5 flex items-center justify-between border-b border-gray-100">
          <h3 className="text-[17px] font-semibold text-ios-text">{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 -mr-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <IconX size={20} className="text-ios-secondary" />
          </button>
        </div>

        <div className="px-5 py-3 space-y-3">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-medium text-ios-secondary uppercase tracking-wide mb-1">Title</label>
            <input
              type="text"
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              maxLength={200}
              className="w-full px-3.5 py-2.5 bg-ios-bg rounded-xl text-ios-text text-[16px] placeholder:text-ios-secondary/50 focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-medium text-ios-secondary uppercase tracking-wide mb-1">Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Add notes or details…"
              rows={2}
              maxLength={2000}
              className="w-full px-3.5 py-2.5 bg-ios-bg rounded-xl text-ios-text text-[15px] placeholder:text-ios-secondary/50 focus:outline-none focus:ring-2 focus:ring-ios-blue/30 resize-none leading-snug"
            />
          </div>

          {/* Priority & Assignees row */}
          <div className="flex gap-3">
            {/* Priority Dropdown */}
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-ios-secondary uppercase tracking-wide mb-1">Priority</label>
              <div className="relative">
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as ActionPriority)}
                  className="w-full appearance-none px-3.5 py-2.5 bg-ios-bg rounded-xl text-ios-text text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-ios-blue/30 pr-9 cursor-pointer"
                >
                  {PRIORITY_OPTIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ios-secondary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              {/* Visual indicator */}
              <div className="mt-1.5 flex gap-1">
                {PRIORITY_OPTIONS.map(p => (
                  <div
                    key={p.value}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      formPriority === p.value ? 'opacity-100' :
                      PRIORITY_OPTIONS.findIndex(o => o.value === formPriority) >= PRIORITY_OPTIONS.findIndex(o => o.value === p.value)
                        ? 'opacity-60' : 'opacity-20'
                    } ${
                      p.value === 'low' ? 'bg-gray-400' :
                      p.value === 'medium' ? 'bg-ios-blue' :
                      p.value === 'high' ? 'bg-orange-500' :
                      'bg-ios-red'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Due date - compact */}
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-ios-secondary uppercase tracking-wide mb-1">Due date</label>
              <div className="flex gap-1.5">
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2.5 bg-ios-bg rounded-xl text-ios-text text-[15px] focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                />
                {formDueDate && (
                  <button
                    type="button"
                    onClick={() => setFormDueDate('')}
                    className="px-2 py-2.5 bg-ios-bg rounded-xl text-ios-secondary active:bg-gray-200 text-[12px]"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Assignees */}
          {members.length > 0 && (
            <div>
              <label className="block text-[11px] font-medium text-ios-secondary uppercase tracking-wide mb-1">Assign to</label>
              <div className="flex flex-wrap gap-1.5">
                {members.map(m => (
                  <button
                    key={m.uid}
                    type="button"
                    onClick={() => toggleAssignee(m.uid)}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                      formAssignees.includes(m.uid)
                        ? 'bg-ios-blue text-white shadow-sm shadow-ios-blue/20'
                        : 'bg-ios-bg text-ios-secondary active:bg-gray-200'
                    }`}
                  >
                    {m.info.displayName.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Photo attachment — compact inline */}
          <div>
            <label className="block text-[11px] font-medium text-ios-secondary uppercase tracking-wide mb-1">Photo</label>
            {formImageUrl ? (
              <div className="relative inline-block rounded-xl overflow-hidden bg-ios-bg">
                <img src={formImageUrl} alt="Attachment" className="h-24 rounded-xl object-cover" />
                <button
                  type="button"
                  onClick={() => setFormImageUrl('')}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <IconX size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2.5 bg-ios-bg rounded-xl border border-dashed border-gray-200 text-ios-secondary text-[13px] font-medium inline-flex items-center gap-2 active:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <><span className="animate-pulse">⏳</span> Uploading…</>
                ) : (
                  <><span>📷</span> Add photo<span className="text-[11px] text-ios-secondary/50">· max 2 MB</span></>
                )}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImagePick(f); e.target.value = ''; }}
            />
            {uploadError && <p className="text-xs text-ios-red mt-1">{uploadError}</p>}
          </div>
        </div>

        {/* Sticky footer buttons */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 py-3 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-ios-blue font-medium bg-ios-bg active:bg-gray-200 transition-all active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!formText.trim() || submitting || uploading}
            className="flex-1 py-2.5 rounded-xl bg-ios-blue text-white font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            {submitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
