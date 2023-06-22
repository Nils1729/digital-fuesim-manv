import type { Material } from '../../models/material';
import type { Patient } from '../../models/patient';
import type { Personnel } from '../../models/personnel';
import type { SimulatedRegion } from '../../models/simulated-region';
import type {
    SimulatedRegionStandIn,
    StandInElement,
} from '../../models/simulated-region-standin';
import {
    isInSpecificSimulatedRegion,
    isInSpecificVehicle,
    isInVehicle,
} from '../../models/utils/position/position-helpers';
import type { Vehicle } from '../../models/vehicle';
import type { ExerciseState } from '../../state';
import { removeElementPosition } from '../../store/action-reducers/utils/spatial-elements';
import { elementTypePluralMap } from '../../utils/element-type-plural-map';
import type { Mutable } from '../../utils/immutability';
import { StrictObject } from '../../utils/strict-object';
import type { UUID } from '../../utils/uuid';
import type { UUIDSet } from '../../utils/uuid-set';

export interface SimRegAssociatedElements {
    patients: { [key: UUID]: Patient };
    vehicles: { [key: UUID]: Vehicle };
    personnel: { [key: UUID]: Personnel };
    materials: { [key: UUID]: Material };
    simulatedRegions: { [key: UUID]: SimulatedRegion };
}

export function addOmitted(
    simulatedRegion: Mutable<SimulatedRegionStandIn>,
    type: keyof SimulatedRegionStandIn['elements'],
    id: UUID
) {
    simulatedRegion.elements[type] ??= {};
    simulatedRegion.elements[type]![id] = true;
}

export function removeOmitted(
    simulatedRegion: Mutable<SimulatedRegionStandIn>,
    type: keyof SimulatedRegionStandIn['elements'],
    id: UUID
) {
    delete simulatedRegion.elements[type]?.[id];
}

export function extractAssociatedElements(
    state: ExerciseState,
    simulatedRegionId: UUID
): SimRegAssociatedElements {
    const simulatedRegion = state.simulatedRegions[
        simulatedRegionId
    ] as SimulatedRegion;

    const patients = StrictObject.filterValues(
        state.patients,
        (_, patient) =>
            isInSpecificSimulatedRegion(patient, simulatedRegionId) ||
            isInVehicle(patient)
    );
    const vehicles = StrictObject.filterValues(state.vehicles, (_, vehicle) =>
        isInSpecificSimulatedRegion(vehicle, simulatedRegionId)
    );
    const personnel = StrictObject.filterValues(
        state.personnel,
        (_, p) =>
            isInSpecificSimulatedRegion(p, simulatedRegionId) ||
            Object.values(vehicles).some(
                (vehicle) => vehicle.personnelIds[p.id]
            )
    );
    const materials = StrictObject.filterValues(
        state.materials,
        (_, m) =>
            isInSpecificSimulatedRegion(m, simulatedRegionId) ||
            Object.values(vehicles).some((vehicle) => vehicle.materialIds[m.id])
    );
    return {
        patients,
        vehicles,
        simulatedRegions: { [simulatedRegionId]: simulatedRegion },
        personnel,
        materials,
    };
}

export function omitAssociatedElementsForRegion(
    state: ExerciseState,
    simulatedRegionId: UUID
): ExerciseState {
    const simReg = state.simulatedRegions[simulatedRegionId]!;

    const omittedPersonnelIds: Mutable<UUIDSet> = {};
    const omittedMaterialIds: Mutable<UUIDSet> = {};
    const omittedVehicleIds: Mutable<UUIDSet> = {};
    const omittedPatientIds: Mutable<UUIDSet> = {};
    StrictObject.values(state.vehicles).forEach((vehicle) => {
        if (!shouldKeepVehicle(state, simulatedRegionId, vehicle)) {
            omittedVehicleIds[vehicle.id] = true;
            Object.assign(omittedMaterialIds, vehicle.materialIds);
            Object.assign(omittedPersonnelIds, vehicle.personnelIds);
            Object.assign(omittedPatientIds, vehicle.patientIds);
        }
    });

    const newPatients = StrictObject.filterValues(state.patients, (_, elm) => {
        if (isInSpecificSimulatedRegion(elm, simulatedRegionId))
            omittedPatientIds[elm.id] = true;
        return !omittedPatientIds[elm.id];
    });

    const newPersonnel = StrictObject.filterValues(
        state.personnel,
        (_, personnel) => !omittedPersonnelIds[personnel.id]
    );
    const newVehicles = StrictObject.filterValues(
        state.vehicles,
        (_, vehicle) => !omittedVehicleIds[vehicle.id]
    );
    const newMaterials = StrictObject.filterValues(
        state.materials,
        (_, material) => !omittedMaterialIds[material.id]
    );

    return {
        ...state,
        simulatedRegions: {
            ...state.simulatedRegions,
            [simulatedRegionId]: {
                type: 'simulatedRegionStandIn',
                id: simulatedRegionId,
                name: simReg.name,
                size: simReg.size,
                borderColor: simReg.borderColor,
                position: simReg.position,
                elements: {
                    materials: omittedMaterialIds,
                    vehicles: omittedVehicleIds,
                    patients: omittedPatientIds,
                    personnel: omittedPersonnelIds,
                },
            },
        },
        patients: newPatients,
        vehicles: newVehicles,
        personnel: newPersonnel,
        materials: newMaterials,
    };
}

export function addAssociatedElements(
    state: ExerciseState,
    associatedElements: SimRegAssociatedElements
): ExerciseState {
    return {
        // TODO: add stuff to spatial trees if necessary
        ...state,
        simulatedRegions: {
            ...state.simulatedRegions,
            ...associatedElements.simulatedRegions,
        },
        patients: {
            ...state.patients,
            ...associatedElements.patients,
        },
        vehicles: {
            ...state.vehicles,
            ...associatedElements.vehicles,
        },
        personnel: {
            ...state.personnel,
            ...associatedElements.personnel,
        },
        materials: {
            ...state.materials,
            ...associatedElements.materials,
        },
    };
}

function shouldKeepVehicle(
    state: ExerciseState,
    omittedRegionId: UUID,
    vehicle: Vehicle
) {
    return (
        !isInSpecificSimulatedRegion(vehicle, omittedRegionId) ||
        StrictObject.keys(vehicle.materialIds).some(
            (materialId) =>
                !(
                    isInSpecificSimulatedRegion(
                        state.materials[materialId]!,
                        omittedRegionId
                    ) ||
                    isInSpecificVehicle(
                        state.materials[materialId]!,
                        vehicle.id
                    )
                )
        ) ||
        StrictObject.keys(vehicle.personnelIds).some(
            (personnelId) =>
                !(
                    isInSpecificSimulatedRegion(
                        state.personnel[personnelId]!,
                        omittedRegionId
                    ) ||
                    isInSpecificVehicle(
                        state.personnel[personnelId]!,
                        vehicle.id
                    )
                )
        )
    );
}

function deleteElement(
    draftState: Mutable<ExerciseState>,
    simulatedRegion: Mutable<SimulatedRegionStandIn>,
    type: StandInElement['type'],
    id: UUID
) {
    addOmitted(simulatedRegion, elementTypePluralMap[type], id);
    if (type !== 'vehicle') removeElementPosition(draftState, type, id);
    delete draftState[elementTypePluralMap[type]][id];
}

export function standInElement(
    draftState: Mutable<ExerciseState>,
    simulatedRegion: Mutable<SimulatedRegionStandIn>,
    element: StandInElement
) {
    if (element.type === 'vehicle') {
        StrictObject.keys(element.materialIds).forEach((id) =>
            deleteElement(draftState, simulatedRegion, 'material', id)
        );
        StrictObject.keys(element.personnelIds).forEach((id) =>
            deleteElement(draftState, simulatedRegion, 'personnel', id)
        );
        StrictObject.keys(element.patientIds).forEach((id) =>
            deleteElement(draftState, simulatedRegion, 'patient', id)
        );
    }
    deleteElement(draftState, simulatedRegion, element.type, element.id);
}
