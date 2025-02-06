
/**
 * Removes keys with null or undefined values from an object.
 *
 * @template T - The type of the object.
 * @param {T} obj - The object from which to remove empty keys.
 * @returns {T} - The object with empty keys removed.
 */
export function removeEmptyKeys<T extends Record<string, any>>(obj: T): T {
  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (obj[key] == null) { 
      delete obj[key];
    }
  }
  return obj;
}
