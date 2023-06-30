import type { SimulatedRegion, SimulatedRegionStandIn } from '../../models';
import type { StandInElement } from '../../models/simulated-region-standin';
import type { ExerciseState } from '../../state';
import type { Mutable, UUID } from '../../utils';
import { StrictObject, elementTypePluralMap } from '../../utils';

export function isStandIn<S extends SimulatedRegion | SimulatedRegionStandIn>(
    simulatedRegion: S
): simulatedRegion is Extract<S, SimulatedRegionStandIn> {
    return simulatedRegion.type === 'simulatedRegionStandIn';
}

export function isMutableStandIn(
    simulatedRegion: Mutable<SimulatedRegion> | Mutable<SimulatedRegionStandIn>
): simulatedRegion is Mutable<SimulatedRegionStandIn> {
    return simulatedRegion.type === 'simulatedRegionStandIn';
}

export function isOmittedWithRegion(
    simulatedRegion: SimulatedRegionStandIn,
    type: StandInElement['type'],
    id: UUID
) {
    const uuidSet = simulatedRegion.elements[elementTypePluralMap[type]];
    return uuidSet && id in uuidSet;
}

export function isOmitted(
    state: ExerciseState,
    type: StandInElement['type'],
    id: UUID
) {
    return StrictObject.values(state.simulatedRegions)
        .filter(isStandIn)
        .find((standIn) => isOmittedWithRegion(standIn, type, id));
}

export function isOmittedMutable(
    state: Mutable<ExerciseState>,
    type: StandInElement['type'],
    id: UUID
) {
    return StrictObject.values(state.simulatedRegions)
        .filter(isStandIn)
        .find((standIn) => isOmittedWithRegion(standIn, type, id));
}
