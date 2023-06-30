import type { HospitalPatient } from '../../models/hospital-patient';
import type { ExerciseRadiogram } from '../../models/radiogram/exercise-radiogram';
import type { ExerciseState } from '../../state';
import type { Mutable } from '../../utils/immutability';
import type { UUID } from '../../utils/uuid';
import type {
    TransfersAssociatedElements,
    getAssociatedElementIds,
} from './association';

export interface HospitalUpdate {
    vehicleId: UUID;
    elementIds: ReturnType<typeof getAssociatedElementIds>;
    hospitalPatients: { [key: UUID]: HospitalPatient };
}

export type RadiogramUpdate =
    | { kind: 'add' | 'mod'; radiogram: ExerciseRadiogram }
    | { kind: 'del' };

export interface OmittableTickActionUpdates {
    radiogramUpdates?: { [key: UUID]: RadiogramUpdate };
    hospitalUpdates?: { [hospitalId: UUID]: HospitalUpdate };
    transferUpdates?: { [key: UUID]: TransfersAssociatedElements };
}

export function ifCollectUpdates(draftState: ExerciseState, fn: () => void) {
    if (draftState.tickUpdates !== undefined) {
        fn();
    }
}

export function collectHospitalUpdate(
    draftState: Mutable<ExerciseState>,
    hospitalId: UUID,
    update: Mutable<HospitalUpdate>
) {
    if (draftState.tickUpdates !== undefined) {
        draftState.tickUpdates.hospitalUpdates ??= {};
        draftState.tickUpdates.hospitalUpdates[hospitalId] = update;
    }
}

export function collectTransferElements(
    draftState: Mutable<ExerciseState>,
    elements: Mutable<TransfersAssociatedElements>
) {
    if (draftState.tickUpdates !== undefined) {
        draftState.tickUpdates.transferUpdates ??= {};
        draftState.tickUpdates.transferUpdates[elements.vehicle.id] = elements;
    }
}

export function collectRadiogram(
    draftState: Mutable<ExerciseState>,
    radiogram: Mutable<ExerciseRadiogram>,
    kind: 'add' | 'del' | 'mod'
): void {
    if (draftState.tickUpdates !== undefined) {
        draftState.tickUpdates.radiogramUpdates ??= {};
        switch (kind) {
            case 'mod':
            case 'add':
                draftState.tickUpdates.radiogramUpdates[radiogram.id] = {
                    kind,
                    radiogram,
                };
                break;
            case 'del':
                draftState.tickUpdates.radiogramUpdates[radiogram.id] = {
                    kind: 'del',
                };
        }
    }
}
