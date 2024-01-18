export function repeat<T>(arr: T[], n: number) {
    let ret = [];
    for (let i=0; i<n; ++i) {
        ret.push(...arr);
    }
    return ret;
}

export function intersect<T>(lhs: T[], rhs: T[]): T[] {
    return lhs.filter(value => rhs.includes(value));
}

export function subtract<T>(lhs: T[], rhs: T[]): T[] {
    return lhs.filter(value => !rhs.includes(value));
}

export function count<T>(arr: T[], value: T) {
    return countIf(arr, x => x === value);
}

export function countIf<T>(arr: T[], predicate: (value: T) => boolean) {
    return sum(arr, value => +predicate(value));
}

export function sum<T>(arr: T[], mapper: (value: T) => number) {
    return arr.reduce((count, value) => count + mapper(value), 0);
}

export function group<Key, Value>(values: Value[], mapper: (value: Value) => Key): Map<Key, Value[]> {
    let map = new Map<Key, Value[]>();
    values.forEach(value => {
        const key = mapper(value);
        map.set(key, (map.get(key) ?? []).concat(value));
    });
    return map;
}

export function rotate<T>(arr: T[], index: number): T[] {
    if (index <= 0) return arr;
    return arr.slice(index, arr.length).concat(arr.slice(0, index));
}

export function rotateToFirstOf<T>(arr: T[], ...values: (T | undefined)[]): T[] {
    return rotate(arr, values.reduce((prevIndex, value) => {
        if (prevIndex < 0 && value) {
            const index = arr.indexOf(value);
            if (index >= 0) return index;
        }
        return prevIndex;
    }, -1));
}