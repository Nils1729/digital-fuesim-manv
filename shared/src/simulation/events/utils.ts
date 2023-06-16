import type { SimulatedRegion, SimulatedRegionStandIn } from '../../models';
import { isStandIn } from '../../state-helpers/standin-helpers/is-standin';
import type { Mutable } from '../../utils';
import { cloneDeepMutable } from '../../utils';
import type { ExerciseSimulationEvent } from './exercise-simulation-event';

export function sendSimulationEvent(
    simulatedRegion: Mutable<SimulatedRegion | SimulatedRegionStandIn>,
    event: ExerciseSimulationEvent
) {
    if (!isStandIn(simulatedRegion)) {
        simulatedRegion.inEvents.push(cloneDeepMutable(event));
    }
}
