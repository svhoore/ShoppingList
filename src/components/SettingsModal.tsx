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
  removeActionCategory: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export default function SettingsModal({
  data, user, isAdmin, inviteLink, onClose, onLeave,
  renameHousehold, setHouseholdIcon, promoteToAdmin, demoteFromAdmin, removeMember, removeCategory, removeActionCategory, signOut,
}: SettingsModalProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(data?.name || '');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [tab, setTab] = useState<'general' | 'members' | 'account'>('general');

  const memberCount = data?.members?.length ?? 0;

  async function handleShare() {
    await shareOrCopy(
      {
        title: data?.name || 'MyHouseholdMgmt',
        text: `Join my household "${data?.name || 'MyHouseholdMgmt'}" on MyHouseholdMgmt!`,
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

  const tabs = [
    { key: 'general' as const, label: 'General' },
    { key: 'members' as const, label: `Members (${memberCount})` },
    { key: 'account' as const, label: 'Account' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-ios-bg rounded-2xl w-full max-w-sm shadow-xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="bg-ios-bg rounded-t-2xl px-5 pt-4 pb-0 z-10 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="w-16" />
              <h3 className="text-[17px] font-semibold text-ios-text">Settings</h3>
              <button onClick={onClose} className="w-16 text-right text-ios-blue text-[17px] font-normal active:opacity-60">
                Done
              </button>
            </div>
            {saved && (
              <p className="text-xs text-ios-green font-medium mb-2 text-center">Saved ✓</p>
            )}
            {/* Tab bar */}
            <div className="flex bg-gray-200/70 rounded-lg p-0.5">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                    tab === t.key
                      ? 'bg-white text-ios-text shadow-sm'
                      : 'text-ios-secondary active:text-ios-text'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">

            {/* ===== GENERAL TAB ===== */}
            {tab === 'general' && (
              <>
                {/* Household Card */}
                <div>
                  <p className="text-[13px] font-medium text-ios-secondary uppercase tracking-wide mb-1.5 px-1">
                    Household
                  </p>
                  <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                    {/* Household Name */}
                    {editingName ? (
                      <form onSubmit={handleSaveName} className="px-4 py-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            autoFocus
                            maxLength={60}
                            className="flex-1 px-3 py-2 bg-ios-bg rounded-lg text-ios-text text-[15px] focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                          />
                          <button type="submit" disabled={!nameInput.trim()} className="px-3.5 py-2 rounded-lg bg-ios-blue text-white text-sm font-medium disabled:opacity-40">
                            Save
                          </button>
                          <button type="button" onClick={() => setEditingName(false)} className="px-2.5 py-2 rounded-lg bg-ios-bg text-ios-secondary text-sm font-medium">
                            ✕
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-ios-secondary mb-0.5">Name</p>
                          <p className="text-[15px] text-ios-text font-medium truncate">{data?.name || 'Untitled'}</p>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => { setNameInput(data?.name || ''); setEditingName(true); }}
                            className="text-ios-blue text-[15px] font-normal ml-3 flex-shrink-0"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    )}

                    {/* Household Icon (Admin only) */}
                    {isAdmin && (
                      <div className="px-4 py-3">
                        <HouseholdIconPicker
                          currentIcon={data?.icon}
                          onSave={handleSaveHouseholdIcon}
                        />
                      </div>
                    )}

                    {/* Invite / Share */}
                    {isAdmin && (
                      <button
                        onClick={handleShare}
                        className="flex items-center justify-between w-full px-4 py-3 active:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="text-[15px] text-ios-blue font-medium text-left">
                            {copied ? 'Link Copied ✓' : 'Share Invite Link'}
                          </p>
                          <p className="text-[11px] text-ios-secondary text-left mt-0.5">
                            Only admins can share this link
                          </p>
                        </div>
                        <span className="text-ios-blue text-lg">↗</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Categories Card */}
                {((data?.customCategories?.length ?? 0) > 0 || (data?.customActionCategories?.length ?? 0) > 0) && (
                  <div>
                    <p className="text-[13px] font-medium text-ios-secondary uppercase tracking-wide mb-1.5 px-1">
                      Categories
                    </p>
                    <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                      {(data?.customCategories?.length ?? 0) > 0 && (
                        <div className="px-4 py-3">
                          <p className="text-[11px] text-ios-secondary mb-2">List Categories</p>
                          <div className="flex flex-wrap gap-1.5">
                            {data?.customCategories?.map((cat) => (
                              <div key={cat} className="flex items-center gap-1 px-2.5 py-1 bg-ios-bg rounded-lg">
                                <span className="text-[13px] font-medium text-ios-text">{cat}</span>
                                {isAdmin && (
                                  <button
                                    onClick={() => removeCategory(cat)}
                                    className="p-0.5 rounded text-ios-secondary hover:text-ios-red transition-colors"
                                    title={`Remove "${cat}"`}
                                  >
                                    <IconX size={12} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {(data?.customActionCategories?.length ?? 0) > 0 && (
                        <div className="px-4 py-3">
                          <p className="text-[11px] text-ios-secondary mb-2">Action Categories</p>
                          <div className="flex flex-wrap gap-1.5">
                            {data?.customActionCategories?.map((cat) => (
                              <div key={cat} className="flex items-center gap-1 px-2.5 py-1 bg-ios-bg rounded-lg">
                                <span className="text-[13px] font-medium text-ios-text">{cat}</span>
                                {isAdmin && (
                                  <button
                                    onClick={() => removeActionCategory(cat)}
                                    className="p-0.5 rounded text-ios-secondary hover:text-ios-red transition-colors"
                                    title={`Remove "${cat}"`}
                                  >
                                    <IconX size={12} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {isAdmin && (
                        <p className="text-[11px] text-ios-secondary px-4 py-2">
                          Removing a category un-assigns it from lists using it.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ===== MEMBERS TAB ===== */}
            {tab === 'members' && (
              <div>
                <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                  {(data?.members ?? []).map((uid) => {
                    const info = data?.memberInfo?.[uid];
                    const isSelf = uid === user?.uid;
                    const memberIsAdmin = data?.admins?.includes(uid) ?? false;
                    const adminCount = data?.admins?.length ?? 0;

                    return (
                      <div key={uid} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-ios-blue/15 rounded-full flex items-center justify-center text-ios-blue font-semibold text-sm flex-shrink-0">
                            {(info?.displayName || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[14px] font-medium text-ios-text truncate">
                                {info?.displayName || 'Unknown'}
                              </p>
                              {isSelf && (
                                <span className="text-[11px] text-ios-secondary flex-shrink-0">you</span>
                              )}
                            </div>
                            <p className="text-[12px] text-ios-secondary truncate">{info?.email || uid}</p>
                          </div>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                            memberIsAdmin ? 'bg-ios-blue/15 text-ios-blue' : 'bg-gray-100 text-ios-secondary'
                          }`}>
                            {memberIsAdmin ? 'Admin' : 'Member'}
                          </span>
                        </div>
                        {isAdmin && !isSelf && (
                          <div className="flex items-center gap-2 mt-2 ml-12">
                            {memberIsAdmin ? (
                              adminCount > 1 && (
                                <button
                                  onClick={() => demoteFromAdmin(uid)}
                                  className="text-[12px] text-ios-secondary px-3 py-1.5 rounded-lg bg-ios-bg active:bg-gray-200 font-medium"
                                >
                                  Remove Admin
                                </button>
                              )
                            ) : (
                              <button
                                onClick={() => promoteToAdmin(uid)}
                                className="text-[12px] text-ios-blue px-3 py-1.5 rounded-lg bg-ios-blue/10 active:bg-ios-blue/20 font-medium"
                              >
                                Make Admin
                              </button>
                            )}
                            <button
                              onClick={() => setRemoveTarget(uid)}
                              className="text-[12px] text-ios-red px-3 py-1.5 rounded-lg bg-ios-red/8 active:bg-ios-red/15 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {isAdmin && (
                  <button
                    onClick={handleShare}
                    className="w-full mt-4 bg-white rounded-xl shadow-sm px-4 py-3 flex items-center justify-between active:bg-gray-50 transition-colors"
                  >
                    <p className="text-[15px] text-ios-blue font-medium">
                      {copied ? 'Link Copied ✓' : 'Invite New Member'}
                    </p>
                    <span className="text-ios-blue text-lg">↗</span>
                  </button>
                )}
              </div>
            )}

            {/* ===== ACCOUNT TAB ===== */}
            {tab === 'account' && (
              <>
                {/* Profile info */}
                <div>
                  <p className="text-[13px] font-medium text-ios-secondary uppercase tracking-wide mb-1.5 px-1">
                    Your Account
                  </p>
                  <div className="bg-white rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div className="w-11 h-11 bg-ios-blue/15 rounded-full flex items-center justify-center text-ios-blue font-bold text-lg flex-shrink-0">
                        {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-ios-text truncate">
                          {user?.displayName || 'Unknown'}
                        </p>
                        <p className="text-[13px] text-ios-secondary truncate">{user?.email || ''}</p>
                      </div>
                      {isAdmin && (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-ios-blue/15 text-ios-blue flex-shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                    <button
                      onClick={signOut}
                      className="w-full px-4 py-3 text-center text-[15px] text-ios-blue font-normal active:bg-gray-50 transition-colors rounded-t-xl"
                    >
                      Sign Out
                    </button>
                    <button
                      onClick={() => setShowLeaveConfirm(true)}
                      className="w-full px-4 py-3 text-center text-[15px] text-ios-red font-normal active:bg-red-50/50 transition-colors rounded-b-xl"
                    >
                      Leave Household
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="h-2" />
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
