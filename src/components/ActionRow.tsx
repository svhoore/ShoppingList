import { useState, useRef, type KeyboardEvent } from 'react';
import type { ActionItem } from '../hooks/useHousehold';
import type { MemberInfo } from '../context/HouseholdContext';
import { IconCheck, IconX, IconDragHandle } from './Icons';

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-100 text-ios-red',
  high: 'bg-orange-100 text-orange-600',
  medium: 'bg-blue-50 text-ios-blue',
  low: 'bg-gray-100 text-ios-secondary',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Med',
  low: 'Low',
};

interface ActionRowProps {
  action: ActionItem;
  memberInfo: Record<string, MemberInfo>;
  onToggle: () => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
  onTap?: () => void;
  onDragStart?: (clientY: number) => void;
  isDragging?: boolean;
  hideCheckbox?: boolean;
}

function formatDueDate(dateStr: string | null): { text: string; className: string } | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, className: 'text-ios-red font-semibold' };
  if (diffDays === 0) return { text: 'Today', className: 'text-orange-500 font-semibold' };
  if (diffDays === 1) return { text: 'Tomorrow', className: 'text-ios-blue' };
  if (diffDays <= 7) return { text: `In ${diffDays}d`, className: 'text-ios-secondary' };
  return { text: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), className: 'text-ios-secondary' };
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function ActionRow({ action, memberInfo, onToggle, onEdit, onDelete, onTap, onDragStart, isDragging, hideCheckbox }: ActionRowProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(action.text);
  const editRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    if (action.completed) return;
    setEditText(action.text);
    setEditing(true);
    setTimeout(() => editRef.current?.focus(), 0);
  }

  function commitEdit() {
    setEditing(false);
    const trimmed = editText.trim();
    if (trimmed && trimmed !== action.text) {
      onEdit(trimmed);
    }
  }

  function handleEditKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    else if (e.key === 'Escape') setEditing(false);
  }

  const dueInfo = formatDueDate(action.dueDate);
  const assigneeEntries = action.assignees
    .map(uid => ({ uid, info: memberInfo[uid] }))
    .filter(e => e.info);

  return (
    <div
      className={`group flex items-center gap-2 px-4 py-3 transition-opacity duration-300 ${
        action.completed ? 'opacity-50' : ''
      } ${isDragging ? 'scale-[1.02]' : ''}`}
    >
      {/* Drag Handle */}
      {!action.completed && onDragStart && (
        <div
          onPointerDown={(e) => { e.preventDefault(); onDragStart(e.clientY); }}
          className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing p-1 -ml-1 text-ios-secondary/40"
        >
          <IconDragHandle />
        </div>
      )}

      {/* Checkbox */}
      {!hideCheckbox && (
        <button
          onClick={onToggle}
          className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
            action.completed ? 'bg-ios-blue border-ios-blue' : 'border-gray-300'
          }`}
        >
          {action.completed && <IconCheck size={12} className="text-white" strokeWidth={3} />}
        </button>
      )}

      {/* Text + metadata */}
      {editing ? (
        <input
          ref={editRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleEditKeyDown}
          maxLength={200}
          className="flex-1 text-[15px] text-ios-text bg-transparent focus:outline-none border-b border-ios-blue/30 py-0.5"
        />
      ) : (
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => { if (onTap && !action.completed) onTap(); else startEdit(); }}
        >
          <span className={`text-[15px] transition-all duration-300 block truncate ${
            action.completed ? 'line-through text-ios-secondary' : 'text-ios-text'
          }`}>
            {action.text}
          </span>
          {!action.completed && (dueInfo || assigneeEntries.length > 0) && (
            <div className="flex items-center gap-2 mt-0.5">
              {dueInfo && (
                <span className={`text-[11px] ${dueInfo.className}`}>
                  {dueInfo.text}
                </span>
              )}
              {assigneeEntries.length > 0 && (
                <div className="flex items-center -space-x-1">
                  {assigneeEntries.slice(0, 3).map((entry) => (
                    <div
                      key={entry.uid}
                      className="w-4 h-4 rounded-full bg-ios-blue/15 text-ios-blue text-[8px] font-bold flex items-center justify-center ring-1 ring-white"
                      title={entry.info?.displayName}
                    >
                      {getInitials(entry.info?.displayName || '?')}
                    </div>
                  ))}
                  {assigneeEntries.length > 3 && (
                    <span className="text-[10px] text-ios-secondary ml-1.5">+{assigneeEntries.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Priority badge */}
      {!editing && !action.completed && (
        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase flex-shrink-0 ${
          PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.low
        }`}>
          {PRIORITY_LABELS[action.priority] || 'Low'}
        </span>
      )}

      {/* Delete button */}
      {!editing && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-lg text-ios-secondary/40 hover:text-ios-red active:text-ios-red active:bg-red-50 transition-all flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <IconX size={16} />
        </button>
      )}
    </div>
  );
}
