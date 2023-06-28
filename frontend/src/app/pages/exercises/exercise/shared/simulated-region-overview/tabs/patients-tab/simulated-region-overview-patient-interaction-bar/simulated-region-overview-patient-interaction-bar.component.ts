import { Component, Input } from '@angular/core';
import type { Mutable, UUIDSet } from 'digital-fuesim-manv-shared';
import { UUID } from 'digital-fuesim-manv-shared';
import { ExerciseService } from 'src/app/core/exercise.service';
import type { AppState } from 'src/app/state/app.state';
import { Store } from '@ngrx/store';
import { selectStateSnapshot } from 'src/app/state/get-state-snapshot';
import { createSelectPatient } from 'src/app/state/application/selectors/exercise.selectors';
import { StartTransferService } from '../../../start-transfer.service';
import { SelectPatientService } from '../../../select-patient.service';

@Component({
    selector: 'app-simulated-region-overview-patient-interaction-bar',
    templateUrl:
        './simulated-region-overview-patient-interaction-bar.component.html',
    styleUrls: [
        './simulated-region-overview-patient-interaction-bar.component.scss',
    ],
})
export class SimulatedRegionOverviewPatientInteractionBarComponent {
    @Input() patientId!: UUID;

    constructor(
        private readonly store: Store<AppState>,
        private readonly exerciseService: ExerciseService,
        readonly selectPatientService: SelectPatientService,
        readonly startTransferService: StartTransferService
    ) {}

    public removeSelectedPatientFromSimulatedRegion() {
        this.exerciseService.proposeAction({
            type: '[Patient] Remove patient from simulated region',
            patientId: this.patientId,
            beforePatient: selectStateSnapshot(
                createSelectPatient(this.patientId),
                this.store
            ),
        });
        this.selectPatientService.selectPatient('');
    }

    public deleteSelectedPatient() {
        this.exerciseService.proposeAction({
            type: '[Patient] Remove patient',
            patientId: this.patientId,
        });
        this.selectPatientService.selectPatient('');
    }

    public initiatePatientTransfer() {
        const patientsToTransfer: Mutable<UUIDSet> = {
            [this.patientId]: true,
        };
        this.startTransferService.initiateNewTransferFor({
            patientsToTransfer,
        });
    }
}
