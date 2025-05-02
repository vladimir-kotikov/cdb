import { CurriedFunction, curry } from "./curry";

export const pass = <T>(value: T): T => value;
export const id = pass;

// Scalar operators

export const isUndefined = (value: unknown): value is undefined =>
  value === undefined;

export const equals: CurriedFunction<
  (value: unknown, other: unknown) => boolean
> = curry((value: unknown, other: unknown): boolean => value === other);

export const oneOf = curry(<T>(values: T[], value: T): boolean =>
  values.includes(value),
);

// Predicate operators

export const not =
  <T>(predicate: (value: T) => boolean) =>
  (value: T) =>
    !predicate(value);

export const either =
  <T>(...predicates: ((value: T) => boolean)[]): ((value: T) => boolean) =>
  (value: T): boolean =>
    predicates.some(predicate => predicate(value));

export const apply =
  <P extends any[], R>(fn: (...args: P) => R) =>
  (args: P): R =>
    fn(...args);
