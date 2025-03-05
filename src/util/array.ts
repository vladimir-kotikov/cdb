type ArrayPredicate<T, U = boolean> = (
  elem: T,
  index: number,
  arr: readonly T[],
) => U;

export const takeFirst = <T, U>(
  fn: ArrayPredicate<T, U | undefined>,
  arr: T[],
): U | undefined => {
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const result = fn(item, i, arr);
    if (result !== undefined) {
      return result;
    }
  }
  return undefined;
};

export const partition = <T>(fn: ArrayPredicate<T>, arr: T[]): [T[], T[]] => {
  const index = arr.findIndex(fn);
  return index === -1 ? [arr, []] : [arr.slice(0, index), arr.slice(index)];
};
