/**
 * cx = "class names".
 *
 * A tiny helper that joins CSS class names together and quietly drops anything
 * that is empty, false, null, or undefined. This lets us write conditional
 * classes in a very readable way:
 *
 *   cx("button", isActive && "button--active")
 *   // -> "button button--active"   (when isActive is true)
 *   // -> "button"                   (when isActive is false)
 *
 * Because we keep all of our class names in `const` objects (see the
 * `*.classes.ts` files next to each component), you almost never type a raw
 * string in JSX. That means typos turn into TypeScript errors instead of
 * silent styling bugs.
 */
export type ClassValue = string | false | null | undefined;

export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
