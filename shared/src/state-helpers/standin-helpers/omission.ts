import type { Patient } from '../../models';
import type {
    SimulatedRegionStandIn,
    StandInElement,
} from '../../models/simulated-region-standin';
import {
    isInSpecificSimulatedRegion,
    isInSpecificVehicle,
} from '../../models/utils/position/position-helpers';
import type { Vehicle } from '../../models/vehicle';
import type { ExerciseState } from '../../state';
import { removeElementPosition } from '../../store/action-reducers/utils/spatial-elements';
import type { ElementTypePluralMap } from '../../utils/element-type-plural-map';
import { elementTypePluralMap } from '../../utils/element-type-plural-map';
import type { Mutable } from '../../utils/immutability';
import { StrictObject } from '../../utils/strict-object';
import type { UUID } from '../../utils/uuid';
import type { UUIDSet } from '../../utils/uuid-set';
import type {
    SimRegAssociatedElements,
    VehicleAssociatedElements,
} from './association';

export function omitSimulatedRegion(
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

export function insertSimulatedRegion(
    state: ExerciseState,
    associatedElements: SimRegAssociatedElements
): ExerciseState {
    return {
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

export function omitElement(
    draftState: Mutable<ExerciseState>,
    simulatedRegion: Mutable<SimulatedRegionStandIn>,
    element: Mutable<Patient | Vehicle>
) {
    if (element.type === 'vehicle') {
        StrictObject.keys(element.materialIds).forEach((id) =>
            omitElementRaw(draftState, simulatedRegion, 'material', id)
        );
        StrictObject.keys(element.personnelIds).forEach((id) =>
            omitElementRaw(draftState, simulatedRegion, 'personnel', id)
        );
        StrictObject.keys(element.patientIds).forEach((id) =>
            omitElementRaw(draftState, simulatedRegion, 'patient', id)
        );
    }
    omitElementRaw(draftState, simulatedRegion, element.type, element.id);
}

export function insertVehicle(
    draftState: Mutable<ExerciseState>,
    simulatedRegion: Mutable<SimulatedRegionStandIn>,
    vehicle: Mutable<Vehicle>,
    associatedElements: Mutable<VehicleAssociatedElements>
) {
    draftState.vehicles[vehicle.id] = vehicle;
    StrictObject.entries(associatedElements).forEach(([type, ids]) =>
        StrictObject.entries(ids!).forEach(([id, element]) => {
            removeOmittedEntry(simulatedRegion, type, id);
            draftState[type][id] = element;
        })
    );
    removeOmittedEntry(simulatedRegion, 'vehicles', vehicle.id);
}

export function insertPatient(
    draftState: Mutable<ExerciseState>,
    simulatedRegion: Mutable<SimulatedRegionStandIn>,
    patient: Mutable<Patient>
) {
    draftState.patients[patient.id] = patient;
    removeOmittedEntry(simulatedRegion, 'patients', patient.id);
}

export function removeOmittedPatient(
    simulatedRegion: Mutable<SimulatedRegionStandIn>,
    patientId: UUID
) {
    removeOmittedEntry(simulatedRegion, 'patients', patientId);
}

export function removeOmittedVehicle(
    simulatedRegion: Mutable<SimulatedRegionStandIn>,
    vehicleId: UUID,
    associatedElements: {
        [key in ElementTypePluralMap[Exclude<
            StandInElement['type'],
            'vehicle'
        >]]?: UUIDSet;
    }
) {
    StrictObject.entries(associatedElements).forEach(([type, ids]) =>
        StrictObject.keys(ids!).forEach((id) =>
            removeOmittedEntry(simulatedRegion, type, id)
        )
    );
    removeOmittedEntry(simulatedRegion, 'vehicles', vehicleId);
}

function removeOmittedEntry(
    simulatedRegion: Mutable<SimulatedRegionStandIn>,
    type: keyof SimulatedRegionStandIn['elements'],
    id: UUID
) {
    delete simulatedRegion.elements[type]?.[id];
}

function addOmittedEntry(
    simulatedRegion: Mutable<SimulatedRegionStandIn>,
    type: keyof SimulatedRegionStandIn['elements'],
    id: UUID
) {
    simulatedRegion.elements[type] ??= {};
    simulatedRegion.elements[type]![id] = true;
}

function omitElementRaw(
    draftState: Mutable<ExerciseState>,
    simulatedRegion: Mutable<SimulatedRegionStandIn>,
    type: StandInElement['type'],
    id: UUID
) {
    addOmittedEntry(simulatedRegion, elementTypePluralMap[type], id);
    // Vehicles are not in spatial tree
    if (type !== 'vehicle') removeElementPosition(draftState, type, id);
    delete draftState[elementTypePluralMap[type]][id];
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
