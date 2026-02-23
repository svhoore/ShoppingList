import { useMemo } from 'react';
import { useHouseholdBase } from './useHouseholdBase';
import { createShoppingOps } from './shoppingOps';
import { createActionOps } from './actionOps';
import { createAdminOps } from './adminOps';

// Re-export types so consumers keep importing from 'useHousehold'
export type {
  ShoppingItem,
  ShoppingList,
  ActionItem,
  ActionList,
  ActionPriority,
  ListCategory,
  HouseholdData,
} from './useHouseholdBase';
export { DEFAULT_CATEGORIES } from './useHouseholdBase';

export function useHousehold(householdId: string | null) {
  const base = useHouseholdBase(householdId);

  const shopping = useMemo(() => createShoppingOps(base), [base.updateLists, base.getRef, base.getInbox, base.getLists, base.setError]);
  const actions = useMemo(() => createActionOps(base), [base.updateActionLists, base.getRef, base.getActionInbox, base.getActionLists, base.setError]);
  const admin = useMemo(() => createAdminOps(base), [base.getRef, base.getLists, base.getActionLists, base.setError, base.dataRef]);

  return {
    data: base.data,
    loading: base.loading,
    error: base.error,
    ...admin,
    ...shopping,
    ...actions,
  };
}
