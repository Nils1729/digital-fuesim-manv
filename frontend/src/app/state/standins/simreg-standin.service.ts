import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { ExerciseService } from 'src/app/core/exercise.service';
import type { UUID } from 'digital-fuesim-manv-shared';
import type { AppState } from '../app.state';
import {
    createReplaceRegionWithStandInAction,
    createRestoreRegionStandInAction,
} from '../application/application.actions';
import { extractAssociatedElements } from './simreg-standin-helpers';

@Injectable({
    providedIn: 'root',
})
export class SimulatedRegionStandInService {
    constructor(
        private readonly store: Store<AppState>,
        private readonly exerciseService: ExerciseService
    ) {}

    replaceRegionWithStandIn(simulatedRegionId: UUID) {
        this.store.dispatch(
            createReplaceRegionWithStandInAction(simulatedRegionId)
        );
    }

    async replaceStandInWithRegion(simulatedRegionId: UUID) {
        // TODO: This is a temporary hack. You would want to select specifically those elements you need instead of all state.
        const completeState = await this.exerciseService.fetchStateFromServer();
        this.store.dispatch(
            createRestoreRegionStandInAction(
                extractAssociatedElements(completeState!, simulatedRegionId)
            )
        );
    }
}
