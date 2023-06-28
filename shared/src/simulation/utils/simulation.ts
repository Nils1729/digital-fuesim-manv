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
    Object.values(draftState.simulatedRegions).forEach((simulatedRegion) => {
        if (isStandIn(simulatedRegion)) return;
        simulateSingleRegion(draftState, simulatedRegion, tickInterval);
    });
}

function simulateSingleRegion(
    draftState: Mutable<ExerciseState>,
    simulatedRegion: Mutable<SimulatedRegion>,
    tickInterval: number
) {
    // We claim this TickEvent was sent by another region to keep it as last event
    sendSimulationEvent(simulatedRegion, TickEvent.create(tickInterval), true);
    handleSimulationEvents(draftState, simulatedRegion);
    tickActivities(draftState, simulatedRegion, tickInterval);
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
    simulatedRegion.behaviors.forEach((behaviorState) => {
        [...simulatedRegion.ownEvents, ...simulatedRegion.inEvents].forEach(
            (event) => {
                simulationBehaviorDictionary[behaviorState.type].handleEvent(
                    draftState,
                    simulatedRegion,
                    behaviorState as any,
                    event
                );
            }
        );
    });
    simulatedRegion.inEvents = [];
    simulatedRegion.ownEvents = [];
}
