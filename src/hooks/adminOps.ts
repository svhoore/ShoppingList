import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteField,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { HouseholdBaseContext } from './useHouseholdBase';

/**
 * Factory that creates household admin and category operations.
 */
export function createAdminOps(ctx: HouseholdBaseContext) {
  const { getRef, getLists, getActionLists, setError, dataRef } = ctx;

  // ---- Household admin ----

  async function renameHousehold(newName: string) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await updateDoc(getRef(), { name: trimmed });
    try {
      const householdId = getRef().id;
      const inviteRef = doc(db, 'invites', householdId);
      await updateDoc(inviteRef, { name: trimmed });
    } catch { /* best-effort — invite doc may not exist for legacy households */ }
  }

  async function setHouseholdIcon(dataUrl: string | null) {
    if (dataUrl) {
      await updateDoc(getRef(), { icon: dataUrl });
    } else {
      await updateDoc(getRef(), { icon: deleteField() });
    }
  }

  async function promoteToAdmin(uid: string) {
    await updateDoc(getRef(), { admins: arrayUnion(uid) });
  }

  async function demoteFromAdmin(uid: string) {
    const admins = dataRef.current?.admins ?? [];
    if (admins.length <= 1 && admins.includes(uid)) {
      setError('Cannot remove the last admin. Promote another member first.');
      return;
    }
    await updateDoc(getRef(), { admins: arrayRemove(uid) });
  }

  async function removeMember(uid: string) {
    await updateDoc(getRef(), {
      members: arrayRemove(uid),
      admins: arrayRemove(uid),
      [`memberInfo.${uid}`]: deleteField(),
    });
  }

  // ---- Category operations ----

  async function addCategory(categoryName: string) {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    try {
      setError(null);
      await updateDoc(getRef(), { customCategories: arrayUnion(trimmed) });
    } catch (e) {
      console.error('Failed to add category', e);
      setError('Failed to add category');
    }
  }

  async function removeCategory(categoryName: string) {
    try {
      setError(null);
      const lists = getLists();
      let listsChanged = false;
      for (const list of lists) {
        if (list.category === categoryName) {
          list.category = '';
          listsChanged = true;
        }
      }
      const update: Record<string, unknown> = { customCategories: arrayRemove(categoryName) };
      if (listsChanged) update.lists = lists;
      await updateDoc(getRef(), update);
    } catch (e) {
      console.error('Failed to remove category', e);
      setError('Failed to remove category');
    }
  }

  async function addActionCategory(categoryName: string) {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    try {
      setError(null);
      await updateDoc(getRef(), { customActionCategories: arrayUnion(trimmed) });
    } catch (e) {
      console.error('Failed to add action category', e);
      setError('Failed to add action category');
    }
  }

  async function removeActionCategory(categoryName: string) {
    try {
      setError(null);
      const actionLists = getActionLists();
      let changed = false;
      for (const al of actionLists) {
        if (al.category === categoryName) {
          al.category = '';
          changed = true;
        }
      }
      const update: Record<string, unknown> = { customActionCategories: arrayRemove(categoryName) };
      if (changed) update.actionLists = actionLists;
      await updateDoc(getRef(), update);
    } catch (e) {
      console.error('Failed to remove action category', e);
      setError('Failed to remove action category');
    }
  }

  return {
    renameHousehold, setHouseholdIcon,
    promoteToAdmin, demoteFromAdmin, removeMember,
    addCategory, removeCategory,
    addActionCategory, removeActionCategory,
  };
}
