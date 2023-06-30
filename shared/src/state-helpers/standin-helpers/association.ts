import type { Material } from '../../models/material';
import type { Patient } from '../../models/patient';
import type { Personnel } from '../../models/personnel';
import type { SimulatedRegion } from '../../models/simulated-region';
import {
    isInSpecificSimulatedRegion,
    isInVehicle,
} from '../../models/utils/position/position-helpers';
import type { Vehicle } from '../../models/vehicle';
import type { ExerciseState } from '../../state';
import { getElement } from '../../store/action-reducers/utils/get-element';
import type { Mutable } from '../../utils/immutability';
import { StrictObject } from '../../utils/strict-object';
import type { UUID } from '../../utils/uuid';

export type SimRegAssociatedElements = VehicleAssociatedElements & {
    simulatedRegions: { [key: UUID]: SimulatedRegion };
    vehicles: { [key: UUID]: Vehicle };
};

export type TransfersAssociatedElements = VehicleAssociatedElements & {
    vehicle: Vehicle;
};

export interface VehicleAssociatedElements {
    patients?: { [key: UUID]: Patient };
    personnel?: { [key: UUID]: Personnel };
    materials?: { [key: UUID]: Material };
}

export function getAssociatedElementIds(vehicle: Vehicle) {
    return {
        personnel: vehicle.personnelIds,
        materials: vehicle.materialIds,
        patients: vehicle.patientIds,
    };
}

export function getAssociatedElements(
    draftState: ExerciseState,
    vehicle: Vehicle
): VehicleAssociatedElements {
    const elements = getAssociatedElementIds(vehicle);
    return {
        materials: StrictObject.mapValues(elements.materials, (id) =>
            getElement(draftState, 'material', id)
        ),
        patients: StrictObject.mapValues(elements.patients, (id) =>
            getElement(draftState, 'patient', id)
        ),
        personnel: StrictObject.mapValues(elements.personnel, (id) =>
            getElement(draftState, 'personnel', id)
        ),
    };
}

export function getAssociatedElementsMutable(
    draftState: Mutable<ExerciseState>,
    vehicle: Vehicle
): Mutable<VehicleAssociatedElements> {
    const elements = getAssociatedElementIds(vehicle);
    return {
        materials: StrictObject.mapValues(elements.materials, (id) =>
            getElement(draftState, 'material', id)
        ),
        patients: StrictObject.mapValues(elements.patients, (id) =>
            getElement(draftState, 'patient', id)
        ),
        personnel: StrictObject.mapValues(elements.personnel, (id) =>
            getElement(draftState, 'personnel', id)
        ),
    };
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
