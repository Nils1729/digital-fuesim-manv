import type { OnDestroy } from '@angular/core';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { ExerciseService } from 'src/app/core/exercise.service';
import type { UUID } from 'digital-fuesim-manv-shared';
import {
    StrictObject,
    extractAssociatedElements,
    isStandIn,
} from 'digital-fuesim-manv-shared';
import type { AppState } from '../app.state';
import {
    createReplaceRegionWithStandInAction,
    createRestoreRegionStandInAction,
} from '../application/application.actions';
import { selectSimulatedRegions } from '../application/selectors/exercise.selectors';
import { selectStateSnapshot } from '../get-state-snapshot';

@Injectable({
    providedIn: 'root',
})
export class SimulatedRegionStandInService implements OnDestroy {
    private requiredRegions: { [key: UUID]: number } = {};
    private lastNeededRegions: { [key: UUID]: number } = {};
    private subscription?: any;
    private readonly holdingDuration = 3000;
    private readonly updateInterval = 1000;

    constructor(
        private readonly store: Store<AppState>,
        private readonly exerciseService: ExerciseService
    ) {}

    start() {
        this.subscription = setInterval(async () => {
            await this.updateStandIns();
        }, this.updateInterval);
    }

    stop() {
        clearInterval(this.subscription);
    }

    reset() {
        console.log('STANDIN SERVICE RESET');
        this.requiredRegions = {};
        this.lastNeededRegions = {};
    }

    get loadedRegions() {
        return StrictObject.mapValues(
            selectStateSnapshot(selectSimulatedRegions, this.store),
            (k, v) => !isStandIn(v)
        );
    }

    replaceRegionWithStandIn(simulatedRegionId: UUID) {
        console.log(`STANDIN: ${simulatedRegionId}`);
        this.store.dispatch(
            createReplaceRegionWithStandInAction(simulatedRegionId)
        );
    }

    async replaceStandInWithRegion(simulatedRegionId: UUID) {
        // TODO: This is a temporary hack. You would want to select specifically those elements you need instead of all state.
        const completeState = await this.exerciseService.fetchStateFromServer();
        console.log(`RELOAD: ${simulatedRegionId}`);
        this.store.dispatch(
            createRestoreRegionStandInAction(
                extractAssociatedElements(completeState!, simulatedRegionId)
            )
        );
    }

    updateLastNeeded() {
        const now = Date.now();
        this.lastNeededRegions = StrictObject.mapValues(
            this.requiredRegions,
            (k, v) =>
                v > 0
                    ? now
                    : this.lastNeededRegions[k] ?? now - this.holdingDuration
        );
    }

    requireRegion(simulatedRegionId: UUID) {
        this.requiredRegions[simulatedRegionId] =
            (this.requiredRegions[simulatedRegionId] ?? 0) + 1;
        this.stop();
        this.start();
        this.updateStandIns();
    }

    unRequireRegion(simulatedRegionId: UUID) {
        this.requiredRegions[simulatedRegionId] =
            (this.requiredRegions[simulatedRegionId] ?? 0) - 1;
    }

    private async updateStandIns() {
        const loadedRegions = this.loadedRegions;
        this.updateLastNeeded();
        const regionsToBeLoaded = StrictObject.keys(
            StrictObject.filterValues(
                this.requiredRegions,
                (k, v) => v > 0 && !loadedRegions[k]
            )
        );
        const discard = Date.now() - this.holdingDuration;
        const regionsToBeUnloaded = StrictObject.keys(
            StrictObject.filterValues(
                loadedRegions,
                (k, v) =>
                    v &&
                    (this.requiredRegions[k] ?? 0) === 0 &&
                    (this.lastNeededRegions[k] === undefined ||
                        this.lastNeededRegions[k]! < discard)
            )
        );

        regionsToBeUnloaded.forEach((rid) =>
            this.replaceRegionWithStandIn(rid as UUID)
        );
        regionsToBeLoaded.forEach(async (rid) =>
            this.replaceStandInWithRegion(rid as UUID)
        );
    }

    ngOnDestroy(): void {
        this.stop();
        console.log('STANDIN SERVICE DESTROY');
    }
}
