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
import {
    selectConfiguration,
    selectSimulatedRegions,
} from '../application/selectors/exercise.selectors';
import { selectStateSnapshot } from '../get-state-snapshot';

@Injectable({
    providedIn: 'root',
})
export class SimulatedRegionStandInService implements OnDestroy {
    private requiredRegions: { [key: UUID]: number } = {};
    private lastNeededRegions: { [key: UUID]: number } = {};
    private subscription?: any;
    private readonly holdingDuration;
    private readonly updateInterval;
    private readonly active;

    constructor(
        private readonly store: Store<AppState>,
        private readonly exerciseService: ExerciseService
    ) {
        const { standInConfig } = selectStateSnapshot(
            selectConfiguration,
            this.store
        );
        this.active = standInConfig.useStandIns;
        if (standInConfig.useStandIns) {
            this.holdingDuration = standInConfig.holdInterval;
            this.updateInterval = standInConfig.updateInterval;
        }
    }

    start() {
        if (!this.active) return;
        this.subscription = setInterval(async () => {
            await this.updateStandIns();
        }, this.updateInterval);
    }

    stop() {
        if (!this.active) return;
        clearInterval(this.subscription);
    }

    reset() {
        if (!this.active) return;
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
        if (!this.active) return;
        console.log(`STANDIN: ${simulatedRegionId}`);
        this.store.dispatch(
            createReplaceRegionWithStandInAction(simulatedRegionId)
        );
    }

    async replaceStandInWithRegion(simulatedRegionId: UUID) {
        if (!this.active) return;
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
        if (!this.active) return;
        const now = Date.now();
        this.lastNeededRegions = StrictObject.mapValues(
            this.requiredRegions,
            (k, v) =>
                v > 0
                    ? now
                    : this.lastNeededRegions[k] ??
                      now - (this.holdingDuration ?? 0)
        );
    }

    requireRegion(simulatedRegionId: UUID) {
        if (!this.active) return;
        this.requiredRegions[simulatedRegionId] =
            (this.requiredRegions[simulatedRegionId] ?? 0) + 1;
        this.stop();
        this.start();
        this.updateStandIns();
    }

    unRequireRegion(simulatedRegionId: UUID) {
        if (!this.active) return;
        this.requiredRegions[simulatedRegionId] =
            (this.requiredRegions[simulatedRegionId] ?? 0) - 1;
    }

    private async updateStandIns() {
        if (!this.active) return;
        const loadedRegions = this.loadedRegions;
        this.updateLastNeeded();
        const regionsToBeLoaded = StrictObject.keys(
            StrictObject.filterValues(
                this.requiredRegions,
                (k, v) => v > 0 && !loadedRegions[k]
            )
        );
        const discard = Date.now() - (this.holdingDuration ?? 0);
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
