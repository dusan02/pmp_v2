import { useState, useMemo } from "react";

export type SortKey = "ticker" | "currentMarketCap" | "preMarketPrice" | "percentChange" | "marketCapDiff";

export function useSortableData<T extends Record<string, any>>(items: T[], initKey: SortKey, initAsc = false) {
  const [sortKey, setSortKey] = useState<SortKey>(initKey);
  const [ascending, setAscending] = useState(initAsc);

  const sorted = useMemo(() => {
    const data = [...items];
    data.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      return (valA > valB ? 1 : -1) * (ascending ? 1 : -1);
    });
    return data;
  }, [items, sortKey, ascending]);

  function requestSort(key: SortKey) {
    if (key === sortKey) {
      setAscending(!ascending);
    } else {
      setSortKey(key);
      setAscending(true);
    }
  }

  return { sorted, sortKey, ascending, requestSort };
} 