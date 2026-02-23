import { useState, useRef, type KeyboardEvent } from 'react';

/**
 * Shared inline-editing logic used by ItemRow and ActionRow.
 * Manages isEditing state, text buffer, input ref focus, commit, and cancel.
 */
export function useInlineEdit(currentText: string, onEdit: (text: string) => void) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(currentText);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setEditText(currentText);
    setIsEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function commitEdit() {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== currentText) onEdit(trimmed);
    setIsEditing(false);
  }

  function handleEditKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setIsEditing(false);
  }

  return { isEditing, editText, setEditText, inputRef, startEdit, commitEdit, handleEditKeyDown };
}
