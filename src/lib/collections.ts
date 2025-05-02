import { Dict as _Dict, Array as List_ } from "@swan-io/boxed";

export type ListPredicate<T, U = boolean> = (
  elem: T,
  index: number,
  arr: readonly T[],
) => U;

export const List = {
  ...List_,
  partition: <T>(fn: ListPredicate<T>, arr: T[]): [T[], T[]] => {
    const index = arr.findIndex(fn);
    return index === -1 ? [arr, []] : [arr.slice(0, index), arr.slice(index)];
  },
  empty: (arr: any[]): boolean => arr.length === 0,
};

export const Dict = {
  ..._Dict,
  filter: <T>(
    dict: Record<string, T>,
    predicate: (key: string, value: T) => boolean,
  ) =>
    Object.fromEntries(
      Object.entries(dict).filter(([key, value]) => predicate(key, value)),
    ),

  filterValues: <T>(
    dict: Record<string, T>,
    predicate: (value: T) => boolean,
  ): Record<string, T> => Dict.filter(dict, (_, value) => predicate(value)),
};

export type Task<T = void, U = void> = (value: T) => Promise<U>;
export const Task = {
  compose:
    <T, U, V>(first: Task<T, U>, second: Task<U, V>): Task<T, V> =>
    value =>
      first(value).then(second),
};
