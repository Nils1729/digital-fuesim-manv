/**
 * Provides stricter typings for common `Object.` functions.
 * To do this, it is assumed that the provided object doesn't have more properties (at runtime) than specified in its type.
 * Based on how the TS type system works, this assumption cannot be made for every Object -> the default typings are very weak.
 * @See https://github.com/microsoft/TypeScript/pull/12253#issuecomment-263132208 and https://stackoverflow.com/questions/55012174/why-doesnt-object-keys-return-a-keyof-type-in-typescript
 */
export namespace StrictObject {
    /**
     * {@link Object.entries} with stricter typings
     * See {@link StrictObject}
     * @returns an array of key/values of the enumerable properties of an object
     */
    export function entries<T extends { [key: string]: any }>(
        object: T
    ): {
        [Key in keyof T]: [Key, T[Key]];
    }[keyof T][] {
        return Object.entries(object);
    }

    /**
     * {@link Object.values} with stricter typings
     * See {@link StrictObject}
     * @returns an array of values of the enumerable properties of an object
     */
    export function values<T extends { [key: string]: any }>(
        object: T
    ): T[keyof T][] {
        return Object.values(object);
    }

    /**
     * {@link Object.keys} with stricter typings
     * See {@link StrictObject}
     * @returns an array of keys of the enumerable properties of an object
     */
    export function keys<T extends { [key: string]: any }>(
        object: T
    ): (keyof T)[] {
        return Object.keys(object);
    }

    /**
     * {@link Object.fromEntries} with stricter typings
     * See {@link StrictObject}
     * @returns an object from an array of key/value pairs
     */
    export function fromEntries<K extends number | string | symbol, V>(
        objectEntries: [K, V][]
    ) {
        return Object.fromEntries(objectEntries) as { [key in K]?: V };
    }

    export function filterValues<T extends { [key: string]: any }>(
        object: T,
        predicate: <K extends keyof T>(key: K, value: T[K]) => boolean
    ) {
        return fromEntries(
            entries(object).filter(([k, v]) => predicate(k, v))
        ) as { [key in keyof T]: T[key] };
    }

    export function mapValues<T extends { [key: string]: any }, TT>(
        object: T,
        map: <K extends keyof T>(key: K, value: T[K]) => TT
    ) {
        return fromEntries(
            entries(object).map(([k, v]) => [k, map(k,v)])
        ) as { [key in keyof T]: TT };
    }
}
