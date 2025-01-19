type ArrayPredicate<T, U = boolean> = (
  elem: T,
  index: number,
  arr: readonly T[],
) => U;

export function mapFirst<T, U>(
  arr: T[],
  fn: ArrayPredicate<T, U | undefined>,
): U | undefined {
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const result = fn(item, i, arr);
    if (result !== undefined) {
      return result;
    }
  }
  return undefined;
}

export function partition<T>(arr: T[], fn: ArrayPredicate<T>): [T[], T[]] {
  const index = arr.findIndex(fn);
  return index === -1 ? [arr, []] : [arr.slice(0, index), arr.slice(index)];
}

export function filterMap<T, U>(
  arr: readonly T[],
  fn: ArrayPredicate<T, U | undefined>,
): U[] {
  return arr.map(fn).filter(x => x !== undefined);
}
