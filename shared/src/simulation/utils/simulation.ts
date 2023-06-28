import type { SimulatedRegion } from '../../models';
import type { ExerciseState } from '../../state';
import { isStandIn } from '../../state-helpers/standin-helpers/is-standin';
import type { Mutable } from '../../utils';
import { simulationActivityDictionary } from '../activities';
import { terminateActivity } from '../activities/utils';
import { simulationBehaviorDictionary } from '../behaviors';
import { TickEvent } from '../events/tick';
import { sendSimulationEvent } from '../events/utils';

export function simulateAllRegions(
    draftState: Mutable<ExerciseState>,
    tickInterval: number
) {
    const regionsToSimulate = Object.values(draftState.simulatedRegions).filter(
        (region): region is Mutable<SimulatedRegion> => !isStandIn(region)
    );
    const forEach = (fn: (region: Mutable<SimulatedRegion>) => void) =>
        regionsToSimulate.forEach(fn);
    const tickEvent = TickEvent.create(tickInterval);
    // We claim this TickEvent was sent by another region to keep it as last event
    forEach((region) => sendSimulationEvent(region, tickEvent, true));
    forEach((region) => handleSimulationEvents(draftState, region));
    forEach((region) => tickActivities(draftState, region, tickInterval));
}

function tickActivities(
    draftState: Mutable<ExerciseState>,
    simulatedRegion: Mutable<SimulatedRegion>,
    tickInterval: number
) {
    Object.values(simulatedRegion.activities).forEach((activityState) => {
        simulationActivityDictionary[activityState.type].tick(
            draftState,
            simulatedRegion,
            activityState as any,
            tickInterval,
            () => {
                terminateActivity(
                    draftState,
                    simulatedRegion,
                    activityState.id
                );
            }
        );
    });
}

export function handleSimulationEvents(
    draftState: Mutable<ExerciseState>,
    simulatedRegion: Mutable<SimulatedRegion>
) {
    [...simulatedRegion.ownEvents, ...simulatedRegion.inEvents].forEach(
        (event) => {
            simulatedRegion.behaviors.forEach((behaviorState) => {
                simulationBehaviorDictionary[behaviorState.type].handleEvent(
                    draftState,
                    simulatedRegion,
                    behaviorState as any,
                    event
                );
            });
        }
    );
    simulatedRegion.inEvents = [];
    simulatedRegion.ownEvents = [];
}
