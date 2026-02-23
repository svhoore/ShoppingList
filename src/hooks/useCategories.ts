import { useMemo } from 'react';
import { DEFAULT_CATEGORIES, type HouseholdData } from './useHousehold';

/** Compute allCategories and usedCategories for shopping lists */
export function useListCategories(data: HouseholdData | null) {
  const allCategories = useMemo(() => {
    const custom = data?.customCategories ?? [];
    return [
      ...DEFAULT_CATEGORIES,
      ...custom.filter((c) => !(DEFAULT_CATEGORIES as readonly string[]).includes(c)),
    ];
  }, [data?.customCategories]);

  const usedCategories = useMemo(() => {
    const cats = new Set((data?.lists ?? []).map((l) => l.category).filter(Boolean));
    return allCategories.filter((c) => cats.has(c));
  }, [data?.lists, allCategories]);

  return { allCategories, usedCategories };
}

/** Compute allActionCategories and usedActionCategories for action lists */
export function useActionCategories(data: HouseholdData | null) {
  const allActionCategories = useMemo(() => {
    const custom = data?.customActionCategories ?? [];
    return [
      ...DEFAULT_CATEGORIES,
      ...custom.filter((c) => !(DEFAULT_CATEGORIES as readonly string[]).includes(c)),
    ];
  }, [data?.customActionCategories]);

  const usedActionCategories = useMemo(() => {
    const cats = new Set((data?.actionLists ?? []).map((al) => al.category).filter(Boolean));
    return allActionCategories.filter((c) => cats.has(c));
  }, [data?.actionLists, allActionCategories]);

  return { allActionCategories, usedActionCategories };
}
