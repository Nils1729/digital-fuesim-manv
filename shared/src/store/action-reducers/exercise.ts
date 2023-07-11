import { IsBoolean, IsInt, IsOptional, IsPositive } from 'class-validator';
import type { Personnel, PersonnelType, Vehicle } from '../../models';
import {
    createPersonnelTypeTag,
    personnelTypeAllowedValues,
    personnelTypeNames,
    Patient,
} from '../../models';
import {
    getStatus,
    isNotInTransfer,
    currentTransferOf,
    TransferPosition,
} from '../../models/utils';
import { changePosition } from '../../models/utils/position/position-helpers-mutable';
import { simulateAllRegions } from '../../simulation/utils/simulation';
import type { ExerciseState } from '../../state';
import type { Mutable, UUID } from '../../utils';
import { cloneDeepMutable, StrictObject } from '../../utils';
import type { ElementTypePluralMap } from '../../utils/element-type-plural-map';
import { elementTypePluralMap } from '../../utils/element-type-plural-map';
import { IsValue } from '../../utils/validators';
import type { Action, ActionReducer } from '../action-reducer';
import { ElementOmittedError, ReducerError } from '../reducer-error';
import type { ExerciseSimulationEvent } from '../../simulation';
import type {
    HospitalUpdate,
    RadiogramUpdate,
    TransfersAssociatedElements,
} from '../../state-helpers';
import {
    isOmittedMutable,
    isStandIn,
    removeOmittedVehicle,
    insertVehicle,
} from '../../state-helpers';
import type { TransferableElementType } from './transfer';
import { letElementArrive } from './transfer';
import { updateTreatments } from './utils/calculate-treatments';
import type { PatientUpdate } from './utils/patient-updates';
import {
    logPatientVisibleStatusChanged,
    logActive,
    logPatient,
} from './utils/log';
import { patientTick } from './utils/patient-ticking';
import { getElement } from './utils';

export class PauseExerciseAction implements Action {
    @IsValue('[Exercise] Pause' as const)
    public readonly type = '[Exercise] Pause';
}

export class StartExerciseAction implements Action {
    @IsValue('[Exercise] Start' as const)
    public readonly type = '[Exercise] Start';
}

export class ExerciseTickAction implements Action {
    @IsValue('[Exercise] Tick' as const)
    public readonly type = '[Exercise] Tick';

    @IsOptional()
    public readonly patientUpdates?: readonly PatientUpdate[];

    /**
     * If true, it is updated which personnel and material treats which patient.
     * This shouldn't be done every tick, because else it could happen that personnel and material "jumps" too fast
     * between two patients. Keep in mind that the treatments are also updated e.g. if a patient/material/personnel etc.
     * is e.g. moved - completely independent from the ticks.
     * The performance optimization resulting from not refreshing the treatments every tick is probably very small in comparison
     * to skipping all patients that didn't change their status since the last treatment calculation
     * (via {@link Patient.visibleStatusChanged}).
     */
    @IsBoolean()
    public readonly refreshTreatments!: boolean;

    @IsInt()
    @IsPositive()
    public readonly tickInterval!: number;

    @IsOptional()
    public readonly inEvents?: {
        [key: UUID]: readonly ExerciseSimulationEvent[];
    };

    @IsOptional()
    public readonly radiogramUpdates?: {
        readonly [key: UUID]: RadiogramUpdate;
    };

    @IsOptional()
    public readonly hospitalUpdates?: { readonly [key: UUID]: HospitalUpdate };

    @IsOptional()
    public readonly transferUpdates?: {
        readonly [key: UUID]: TransfersAssociatedElements;
    };
}

export namespace ExerciseActionReducers {
    export const pauseExercise: ActionReducer<PauseExerciseAction> = {
        action: PauseExerciseAction,
        reducer: (draftState) => {
            if (draftState.currentStatus !== 'running') {
                throw new ReducerError('Cannot pause not running exercise');
            }
            draftState.currentStatus = 'paused';
            return draftState;
        },
        rights: 'trainer',
    };

    export const startExercise: ActionReducer<StartExerciseAction> = {
        action: StartExerciseAction,
        reducer: (draftState) => {
            if (draftState.currentStatus === 'running') {
                throw new ReducerError('Cannot start already running exercise');
            }
            draftState.currentStatus = 'running';
            return draftState;
        },
        rights: 'trainer',
    };

    export const exerciseTick: ActionReducer<ExerciseTickAction> = {
        action: ExerciseTickAction,
        reducer: (
            draftState,
            {
                tickInterval,
                patientUpdates: actionPatientUpdates,
                inEvents,
                hospitalUpdates,
                transferUpdates,
                radiogramUpdates,
            }
        ) => {
            const patientUpdates =
                actionPatientUpdates ?? patientTick(draftState, tickInterval);

            // Refresh the current time
            draftState.currentTime += tickInterval;

            // Refresh patient status
            patientUpdates.forEach((patientUpdate) => {
                try {
                    const currentPatient = getElement(
                        draftState,
                        'patient',
                        patientUpdate.id
                    );

                    const visibleStatusBefore = Patient.getVisibleStatus(
                        currentPatient,
                        draftState.configuration.pretriageEnabled,
                        draftState.configuration.bluePatientsEnabled
                    );

                    currentPatient.currentHealthStateId =
                        patientUpdate.nextStateId;
                    currentPatient.health = patientUpdate.nextHealthPoints;
                    currentPatient.stateTime = patientUpdate.nextStateTime;
                    currentPatient.treatmentTime = patientUpdate.treatmentTime;
                    currentPatient.realStatus = getStatus(
                        currentPatient.health
                    );

                    const visibleStatusAfter = Patient.getVisibleStatus(
                        currentPatient,
                        draftState.configuration.pretriageEnabled,
                        draftState.configuration.bluePatientsEnabled
                    );
                    // Save this to the state because the treatments aren't refreshed in every tick
                    currentPatient.visibleStatusChanged =
                        visibleStatusBefore !== visibleStatusAfter;
                    if (
                        // We only want to do this expensive calculation, when it is really necessary
                        currentPatient.visibleStatusChanged
                    ) {
                        updateTreatments(draftState, currentPatient);
                        logPatientVisibleStatusChanged(
                            draftState,
                            currentPatient.id
                        );
                    }
                } catch (e: unknown) {
                    if (e instanceof ElementOmittedError) {
                        return;
                    }
                    throw e;
                }
            });

            // Refresh transfers
            refreshTransfer(draftState, 'vehicle', tickInterval);
            refreshTransfer(draftState, 'personnel', tickInterval);

            if (inEvents) {
                StrictObject.entries(inEvents).forEach(([sid, events]) => {
                    const simReg = getElement(
                        draftState,
                        'simulatedRegion',
                        sid
                    );
                    if (
                        !isStandIn(simReg) &&
                        events.length !== simReg.inEvents.length
                    ) {
                        simReg.inEvents = cloneDeepMutable(events);
                    }
                });
            }

            simulateAllRegions(draftState, tickInterval);

            if (radiogramUpdates) {
                StrictObject.entries(radiogramUpdates).forEach(([rid, rad]) => {
                    switch (rad.kind) {
                        case 'add':
                            if (!(rid in draftState.radiograms)) {
                                draftState.radiograms[rid] = cloneDeepMutable(
                                    rad.radiogram
                                );
                            }
                            break;
                        case 'mod':
                            if (
                                isStandIn(
                                    getElement(
                                        draftState,
                                        'simulatedRegion',
                                        rad.radiogram.simulatedRegionId
                                    )
                                )
                            ) {
                                draftState.radiograms[rid] = cloneDeepMutable(
                                    rad.radiogram
                                );
                            }
                            break;
                        case 'del':
                            delete draftState.radiograms[rid];
                    }
                });
            }

            if (hospitalUpdates) {
                StrictObject.entries(hospitalUpdates).forEach(
                    ([hid, update]) => {
                        const { hospitalPatients, vehicleId, elementIds } =
                            update;
                        StrictObject.entries(hospitalPatients).forEach(
                            ([pid, hospitalPatient]) => {
                                if (!(pid in draftState.hospitalPatients)) {
                                    draftState.hospitalPatients[pid] =
                                        cloneDeepMutable(hospitalPatient);
                                    const hospital = getElement(
                                        draftState,
                                        'hospital',
                                        hid
                                    );
                                    hospital.patientIds[pid] = true;
                                }
                            }
                        );
                        const omittedRegion = isOmittedMutable(
                            draftState,
                            'vehicle',
                            'vehicleId'
                        );
                        if (omittedRegion !== undefined) {
                            removeOmittedVehicle(
                                omittedRegion,
                                vehicleId,
                                elementIds
                            );
                        }
                    }
                );
            }

            if (transferUpdates) {
                StrictObject.entries(transferUpdates).forEach(
                    ([vid, update]) => {
                        const omittedRegion = isOmittedMutable(
                            draftState,
                            'vehicle',
                            vid
                        );
                        if (omittedRegion) {
                            const { vehicle, ...elements } = update;
                            insertVehicle(
                                draftState,
                                omittedRegion,
                                cloneDeepMutable(vehicle),
                                cloneDeepMutable(elements)
                            );
                        }
                    }
                );
            }

            if (logActive(draftState)) {
                const newTreatmentAssignment =
                    calculateTreatmentAssignment(draftState);
                evaluateTreatmentReassignment(
                    draftState,
                    newTreatmentAssignment
                );
                draftState.previousTreatmentAssignment = newTreatmentAssignment;
            }

            return draftState;
        },
        rights: 'server',
    };
}

type TransferTypePluralMap = Pick<
    ElementTypePluralMap,
    TransferableElementType
>;

function refreshTransfer(
    draftState: Mutable<ExerciseState>,
    type: keyof TransferTypePluralMap,
    tickInterval: number
): void {
    const elements = draftState[elementTypePluralMap[type]];
    Object.values(elements).forEach((element: Mutable<Personnel | Vehicle>) => {
        if (isNotInTransfer(element)) {
            return;
        }
        if (currentTransferOf(element).isPaused) {
            const newTransfer = cloneDeepMutable(currentTransferOf(element));
            newTransfer.endTimeStamp += tickInterval;
            changePosition(
                element,
                TransferPosition.create(newTransfer),
                draftState
            );
            return;
        }
        // Not transferred yet
        if (currentTransferOf(element).endTimeStamp > draftState.currentTime) {
            return;
        }
        letElementArrive(draftState, type, element.id);
    });
}

export interface TreatmentAssignment {
    [patientId: UUID]: { [personnelType in PersonnelType]: number };
}

function calculateTreatmentAssignment(
    draftState: Mutable<ExerciseState>
): TreatmentAssignment {
    const treatmentAssignment = StrictObject.fromEntries(
        Object.keys(draftState.patients).map((patientId) => [
            patientId,
            StrictObject.fromEntries(
                StrictObject.keys(personnelTypeAllowedValues).map(
                    (personnelType) => [personnelType, 0]
                )
            ),
        ])
    ) as TreatmentAssignment;

    StrictObject.values(draftState.personnel).forEach((personnel) => {
        const assignedPatientCount = StrictObject.keys(
            personnel.assignedPatientIds
        ).length;
        StrictObject.keys(personnel.assignedPatientIds)
            .filter((patientId) => treatmentAssignment[patientId])
            .forEach((patientId) => {
                treatmentAssignment[patientId]![personnel.personnelType]! +=
                    1 / assignedPatientCount;
            });
    });

    return treatmentAssignment;
}

function evaluateTreatmentReassignment(
    draftState: Mutable<ExerciseState>,
    newTreatmentAssignment: TreatmentAssignment
) {
    if (!draftState.previousTreatmentAssignment) return;

    Object.keys(newTreatmentAssignment)
        .filter((patientId) =>
            StrictObject.keys(personnelTypeAllowedValues).some(
                (personnelType) =>
                    newTreatmentAssignment[patientId]![personnelType] !==
                    draftState.previousTreatmentAssignment![patientId]?.[
                        personnelType
                    ]
            )
        )
        .forEach((patientId) => {
            logPatient(
                draftState,
                StrictObject.entries(newTreatmentAssignment[patientId]!)
                    .filter(([, count]) => count > 0)
                    .map(([personnelType]) =>
                        createPersonnelTypeTag(draftState, personnelType)
                    ),
                `Diese Einsatzkräfte wurden dem Patienten neu zugeteilt: ${
                    StrictObject.entries(newTreatmentAssignment[patientId]!)!
                        .filter(([, count]) => count > 0)
                        .map(
                            ([personnelType, count]) =>
                                `${+count.toFixed(2)} ${
                                    personnelTypeNames[personnelType]
                                }`
                        )
                        .join(', ') || 'Keine Einsatzkräfte'
                }.`,
                patientId
            );
        });
}
