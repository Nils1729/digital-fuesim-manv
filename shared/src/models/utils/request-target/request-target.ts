import type { SimulatedRegion, VehicleResource } from '../../../models';
import type { ExerciseState } from '../../../state';
import type { Constructor, Mutable } from '../../../utils';

export class RequestTargetConfiguration {
    public readonly type!: `${string}RequestTarget`;
}

export interface RequestTarget<T extends RequestTargetConfiguration> {
    readonly configuration: Constructor<T>;
    readonly createRequest: (
        draftState: Mutable<ExerciseState>,
        requestingSimulatedRegion: Mutable<SimulatedRegion>,
        configuration: Mutable<T>,
        requestedResource: Mutable<VehicleResource>,
        key: string
    ) => void;
}
