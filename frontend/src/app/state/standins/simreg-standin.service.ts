import type { OnDestroy } from '@angular/core';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { ExerciseService } from 'src/app/core/exercise.service';
import type { UUID } from 'digital-fuesim-manv-shared';
import { StrictObject, isStandIn } from 'digital-fuesim-manv-shared';
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
    private fixedStandIns?: UUID[];
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
            if (standInConfig.standInIds !== undefined) {
                this.fixedStandIns = standInConfig.standInIds;
            }
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
        const associatedElements =
            await this.exerciseService.fetchPartialStateFromServer(
                simulatedRegionId
            );
        console.log(associatedElements);
        console.log(`RELOAD: ${simulatedRegionId}`);
        if (associatedElements) {
            this.store.dispatch(
                createRestoreRegionStandInAction(associatedElements)
            );
        }
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
        let regionsToBeLoaded, regionsToBeUnloaded;

        if (this.fixedStandIns === undefined) {
            this.updateLastNeeded();
            regionsToBeLoaded = StrictObject.keys(
                StrictObject.filterValues(
                    this.requiredRegions,
                    (k, v) => v > 0 && !loadedRegions[k]
                )
            );
            const discard = Date.now() - (this.holdingDuration ?? 0);
            regionsToBeUnloaded = StrictObject.keys(
                StrictObject.filterValues(
                    loadedRegions,
                    (k, v) =>
                        v &&
                        (this.requiredRegions[k] ?? 0) === 0 &&
                        (this.lastNeededRegions[k] === undefined ||
                            this.lastNeededRegions[k]! < discard)
                )
            );
        } else {
            regionsToBeUnloaded = this.fixedStandIns.filter(
                (id) => loadedRegions[id]
            );
            regionsToBeLoaded = StrictObject.keys(
                StrictObject.filterValues(
                    loadedRegions,
                    (k, v) => !v && !this.fixedStandIns?.includes(k as string)
                )
            );
        }

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
