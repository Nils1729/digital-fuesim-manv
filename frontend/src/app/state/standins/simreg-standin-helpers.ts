import type {
    UUID,
    Patient,
    Vehicle,
    Personnel,
    Material,
    SimulatedRegion,
    ExerciseState,
    Mutable,
    UUIDSet,
} from 'digital-fuesim-manv-shared';
import {
    isInVehicle,
    StrictObject,
    isInSpecificSimulatedRegion,
    isInSpecificVehicle,
} from 'digital-fuesim-manv-shared';

export interface SimRegAssociatedElements {
    patients: { [key: UUID]: Patient };
    vehicles: { [key: UUID]: Vehicle };
    personnel: { [key: UUID]: Personnel };
    materials: { [key: UUID]: Material };
    simulatedRegions: { [key: UUID]: SimulatedRegion };
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
    const personnel = StrictObject.filterValues(state.personnel, (_, p) =>
        Object.values(vehicles).some((vehicle) => vehicle.personnelIds[p.id])
    );
    const materials = StrictObject.filterValues(state.materials, (_, m) =>
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

export function omitAssociatedElements(
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

    const newPatients = StrictObject.filterValues(
        state.patients,
        (_, elm) =>
            !isInSpecificSimulatedRegion(elm, simulatedRegionId) &&
            !omittedPatientIds[elm.id]
    );

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
        Object.keys(vehicle.materialIds).some(
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
        Object.keys(vehicle.personnelIds).some(
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
