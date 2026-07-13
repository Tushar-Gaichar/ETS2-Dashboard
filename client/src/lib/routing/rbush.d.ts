/**
 * rbush ships its own index.d.ts, but its package.json "exports" field
 * doesn't include a "types" condition, so TypeScript's "bundler"
 * moduleResolution can't find it. Minimal shim covering just the API this
 * project actually uses.
 */
declare module "rbush" {
  export default class RBush<T> {
    constructor(maxEntries?: number);
    load(items: T[]): this;
    insert(item: T): this;
    remove(item: T, equalsFn?: (a: T, b: T) => boolean): this;
    clear(): this;
    search(bbox: { minX: number; minY: number; maxX: number; maxY: number }): T[];
    collides(bbox: { minX: number; minY: number; maxX: number; maxY: number }): boolean;
    all(): T[];
    toJSON(): unknown;
    fromJSON(data: unknown): this;
  }
}
