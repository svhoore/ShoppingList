import { useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import type { HouseholdData } from '../hooks/useHousehold';
import ConfirmDialog from './ConfirmDialog';
import HouseholdIconPicker from './HouseholdIconPicker';
import { IconX } from './Icons';
import { shareOrCopy } from '../lib/share';

interface SettingsModalProps {
  data: HouseholdData | null;
  user: User | null;
  isAdmin: boolean;
  inviteLink: string;
  onClose: () => void;
  onLeave: () => Promise<void>;
  renameHousehold: (name: string) => Promise<void>;
  setHouseholdIcon: (dataUrl: string | null) => Promise<void>;
  promoteToAdmin: (uid: string) => Promise<void>;
  demoteFromAdmin: (uid: string) => Promise<void>;
  removeMember: (uid: string) => Promise<void>;
  removeCategory: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export default function SettingsModal({
  data, user, isAdmin, inviteLink, onClose, onLeave,
  renameHousehold, setHouseholdIcon, promoteToAdmin, demoteFromAdmin, removeMember, removeCategory, signOut,
}: SettingsModalProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(data?.name || '');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const memberCount = data?.members?.length ?? 0;

  async function handleShare() {
    await shareOrCopy(
      {
        title: data?.name || 'Our Shopping List',
        text: `Join my household "${data?.name || 'Our Shopping List'}" on Our Shopping List!`,
        url: inviteLink,
      },
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
    );
  }

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    if (nameInput.trim()) {
      await renameHousehold(nameInput);
      setEditingName(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  async function handleSaveHouseholdIcon(dataUrl: string | null) {
    await setHouseholdIcon(dataUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleRemoveMember() {
    if (removeTarget) {
      await removeMember(removeTarget);
      setRemoveTarget(null);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-xl max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white rounded-t-2xl p-5 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ios-text">Household Settings</h3>
              <button onClick={onClose} className="p-3 rounded-lg text-ios-secondary active:bg-gray-100">
                <IconX />
              </button>
            </div>
            {saved && (
              <p className="text-xs text-ios-green font-medium mt-2">Saved ✓</p>
            )}
          </div>

          <div className="p-5 space-y-5">
            {/* Household Name */}
            <div>
              <label className="block text-xs font-medium text-ios-secondary uppercase tracking-wide mb-2">
                Household Name
              </label>
              {editingName ? (
                <form onSubmit={handleSaveName} className="flex gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    autoFocus
                    maxLength={60}
                    className="flex-1 px-4 py-2.5 bg-ios-bg rounded-xl text-ios-text text-[15px] focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                  />
                  <button type="submit" disabled={!nameInput.trim()} className="px-4 py-2.5 rounded-xl bg-ios-blue text-white text-sm font-medium disabled:opacity-40">
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingName(false)} className="px-3 py-2.5 rounded-xl bg-ios-bg text-ios-secondary text-sm font-medium">
                    ✕
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between px-4 py-2.5 bg-ios-bg rounded-xl">
                  <span className="text-ios-text text-[15px] font-medium">{data?.name || 'Untitled'}</span>
                  {isAdmin && (
                    <button
                      onClick={() => { setNameInput(data?.name || ''); setEditingName(true); }}
                      className="text-ios-blue text-sm font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Household Icon (Admin only) */}
            {isAdmin && (
              <HouseholdIconPicker
                currentIcon={data?.icon}
                onSave={handleSaveHouseholdIcon}
              />
            )}

            {/* Invite Link (Admin only) */}
            {isAdmin && (
              <div>
                <label className="block text-xs font-medium text-ios-secondary uppercase tracking-wide mb-2">
                  Invite Link
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-2.5 bg-ios-bg rounded-xl text-ios-secondary text-[13px] font-mono truncate">
                    {inviteLink}
                  </div>
                  <button
                    onClick={handleShare}
                    className="px-4 py-2.5 rounded-xl bg-ios-blue text-white text-sm font-medium flex-shrink-0 active:scale-[0.98] transition-transform"
                  >
                    {copied ? '✓' : 'Share'}
                  </button>
                </div>
                <p className="text-[11px] text-ios-secondary mt-1.5">
                  Only admins can see and share this link.
                </p>
              </div>
            )}

            {/* Custom Categories (Admin) */}
            {isAdmin && (data?.customCategories?.length ?? 0) > 0 && (
              <div>
                <label className="block text-xs font-medium text-ios-secondary uppercase tracking-wide mb-2">
                  Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {data?.customCategories?.map((cat) => (
                    <div key={cat} className="flex items-center gap-1 px-3 py-1.5 bg-ios-bg rounded-lg">
                      <span className="text-[13px] font-medium text-ios-text">{cat}</span>
                      <button
                        onClick={() => removeCategory(cat)}
                        className="p-0.5 rounded text-ios-secondary hover:text-ios-red transition-colors"
                        title={`Remove "${cat}"`}
                      >
                        <IconX size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-ios-secondary mt-1.5">
                  Removing a category also un-assigns it from any lists using it.
                </p>
              </div>
            )}

            {/* Members List */}
            <div>
              <label className="block text-xs font-medium text-ios-secondary uppercase tracking-wide mb-2">
                Members ({memberCount})
              </label>
              <div className="bg-ios-bg rounded-xl divide-y divide-gray-200/60">
                {(data?.members ?? []).map((uid) => {
                  const info = data?.memberInfo?.[uid];
                  const isSelf = uid === user?.uid;
                  const memberIsAdmin = data?.admins?.includes(uid) ?? false;
                  const adminCount = data?.admins?.length ?? 0;

                  return (
                    <div key={uid} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 bg-ios-blue/15 rounded-full flex items-center justify-center text-ios-blue font-semibold text-sm flex-shrink-0">
                        {(info?.displayName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-ios-text truncate">
                          {info?.displayName || 'Unknown'}{isSelf ? ' (you)' : ''}
                        </p>
                        <p className="text-[12px] text-ios-secondary truncate">{info?.email || uid}</p>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        memberIsAdmin ? 'bg-ios-blue/15 text-ios-blue' : 'bg-gray-200 text-ios-secondary'
                      }`}>
                        {memberIsAdmin ? 'Admin' : 'Member'}
                      </span>
                      {isAdmin && !isSelf && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {memberIsAdmin ? (
                            adminCount > 1 && (
                              <button
                                onClick={() => demoteFromAdmin(uid)}
                                className="text-[11px] text-ios-secondary px-2 py-1 rounded-lg bg-gray-200 active:bg-gray-300"
                                title="Remove admin role"
                              >
                                Demote
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => promoteToAdmin(uid)}
                              className="text-[11px] text-ios-blue px-2 py-1 rounded-lg bg-ios-blue/10 active:bg-ios-blue/20"
                              title="Make admin"
                            >
                              Admin
                            </button>
                          )}
                          <button
                            onClick={() => setRemoveTarget(uid)}
                            className="p-1 rounded-lg text-ios-red active:bg-red-50"
                            title="Remove member"
                          >
                            <IconX size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t border-gray-100">
              <button
                onClick={signOut}
                className="w-full py-2.5 rounded-xl text-ios-secondary font-medium bg-ios-bg active:bg-gray-200 transition-all active:scale-[0.98] text-[15px]"
              >
                Sign out
              </button>
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="w-full py-2.5 rounded-xl text-ios-red font-medium bg-ios-red/8 active:bg-ios-red/15 transition-all active:scale-[0.98] text-[15px]"
              >
                Leave Household
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Remove Member Confirm */}
      <ConfirmDialog
        open={!!removeTarget}
        title="Remove Member"
        message={`Remove ${data?.memberInfo?.[removeTarget || '']?.displayName || 'this member'} from the household?`}
        confirmLabel="Remove"
        onConfirm={handleRemoveMember}
        onCancel={() => setRemoveTarget(null)}
      />

      {/* Leave Household Confirm */}
      <ConfirmDialog
        open={showLeaveConfirm}
        title="Leave Household"
        message="You'll need a new invite link to rejoin."
        confirmLabel="Leave"
        onConfirm={() => { onLeave(); setShowLeaveConfirm(false); onClose(); }}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </>
  );
}
