import type { ExerciseAction } from 'digital-fuesim-manv-shared';
import { StrictObject } from 'digital-fuesim-manv-shared';

export class ActionTiming<Key extends string = ExerciseAction['type']> {
    _timings: { [key in Key]?: number[] } = {};

    add(type: Key, time: number) {
        this._timings[type] ??= [];
        this._timings[type]?.push(time);
    }

    measureWrap<FuncType extends (...args: any) => any>(
        f: (...args: Parameters<FuncType>) => ReturnType<FuncType>,
        keyExtractor: (
            args: Parameters<FuncType>,
            ret: ReturnType<FuncType>
        ) => Key
    ) {
        return (...args: Parameters<FuncType>) => {
            const beforeProcessing = performance.now();
            const ret = f(...args);
            const afterProcessing = performance.now();
            this.add(
                keyExtractor(args, ret),
                afterProcessing - beforeProcessing
            );
        };
    }

    measureTime(key: Key, f: () => void) {
        const beforeProcessing = performance.now();
        f();
        const afterProcessing = performance.now();
        this.add(key, afterProcessing - beforeProcessing);
    }

    clear() {
        this._timings = {};
    }

    stats(n?: number) {
        return Object.fromEntries(
            StrictObject.entries(this._timings)
                .filter(([k, v]) => !!v)
                .map(([actionType, values]) => {
                    const v = values!.slice(0, n);

                    const plus = (a: number, b: number) => a + b;
                    const count = v.length;
                    const total = v.reduce(plus, 0);
                    const avg = total / count;
                    const stddev =
                        v.map((a) => (a * a) / count).reduce(plus, 0) -
                        avg * avg;
                    const variance = Math.sqrt(stddev);
                    v.sort((a, b) => a - b);

                    const max = v[count - 1];
                    const min = v[0];
                    const med =
                        (v[Math.floor((count - 1) / 2)]! +
                            v[Math.ceil((count - 1) / 2)]!) /
                        2;
                    return [
                        actionType,
                        {
                            count,
                            total,
                            avg,
                            stddev,
                            variance,
                            min,
                            med,
                            max,
                        },
                    ];
                })
        );
    }

    raw() {
        return structuredClone(this._timings) as typeof this._timings;
    }

    table() {
        console.table(this.stats());
    }
}

export const actionTiming = new ActionTiming();
