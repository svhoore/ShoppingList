import { useState, useRef, type KeyboardEvent } from 'react';
import type { ShoppingItem } from '../hooks/useHousehold';
import { IconCheck, IconX, IconDragHandle } from './Icons';

interface ItemRowProps {
  item: ShoppingItem;
  onToggle: () => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
  onToggleBonus?: () => void;
  onDragStart?: (clientY: number) => void;
  isDragging?: boolean;
}

export default function ItemRow({ item, onToggle, onEdit, onDelete, onToggleBonus, onDragStart, isDragging }: ItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const editRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    if (item.completed) return;
    setEditText(item.text);
    setEditing(true);
    setTimeout(() => editRef.current?.focus(), 0);
  }

  function commitEdit() {
    setEditing(false);
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text) {
      onEdit(trimmed);
    }
  }

  function handleEditKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  }

  return (
    <div
      className={`group flex items-center gap-2 px-4 py-3 transition-opacity duration-300 ${
        item.completed ? 'opacity-50' : ''
      } ${isDragging ? 'scale-[1.02]' : ''}`}
    >
      {/* Drag Handle */}
      {!item.completed && onDragStart && (
        <div
          onPointerDown={(e) => { e.preventDefault(); onDragStart(e.clientY); }}
          className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing p-1 -ml-1 text-ios-secondary/40"
        >
          <IconDragHandle />
        </div>
      )}

      {/* Circle Checkbox */}
      <button
        onClick={onToggle}
        className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
          item.completed ? 'bg-ios-green border-ios-green' : 'border-gray-300'
        }`}
      >
        {item.completed && <IconCheck size={12} className="text-white" strokeWidth={3} />}
      </button>

      {/* Text / Edit input */}
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
        <span
          onClick={startEdit}
          className={`flex-1 text-[15px] transition-all duration-300 ${
            item.completed ? 'line-through text-ios-secondary' : 'text-ios-text cursor-text'
          }`}
        >
          {item.text}
          {item.bonus && (
            <span className="ml-1.5 inline-flex items-center align-middle px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[11px] font-bold leading-none uppercase">Bonus</span>
          )}
        </span>
      )}

      {/* Bonus toggle */}
      {!editing && !item.completed && onToggleBonus && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleBonus(); }}
          className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold uppercase flex-shrink-0 transition-colors ${
            item.bonus
              ? 'bg-orange-100 text-orange-600 active:bg-orange-200'
              : 'bg-gray-100 text-ios-secondary/50 active:bg-gray-200'
          }`}
          title={item.bonus ? 'Remove Bonus tag' : 'Mark as Bonus (on sale)'}
        >
          {item.bonus ? '🏷️' : '🏷️'}
        </button>
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
