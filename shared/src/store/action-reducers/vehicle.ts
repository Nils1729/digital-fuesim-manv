import { Type } from 'class-transformer';
import {
    Allow,
    IsArray,
    IsString,
    IsUUID,
    ValidateNested,
} from 'class-validator';
import { Material } from '../../models/material';
import {
    changePosition,
    changePositionWithId,
} from '../../models/utils/position/position-helpers-mutable';
import type { ExerciseState } from '../../state';
import { imageSizeToPosition } from '../../state-helpers/image-size-to-position';
import type { ElementTypePluralMap, Mutable, UUIDSet } from '../../utils';
import {
    cloneDeepMutable,
    StrictObject,
    UUID,
    uuidValidationOptions,
} from '../../utils';
import { IsLiteralUnion, IsValue } from '../../utils/validators';
import type { Action, ActionReducer } from '../action-reducer';
import { ElementOmittedError, ReducerError } from '../reducer-error';
import { sendSimulationEvent } from '../../simulation/events/utils';
import {
    MaterialAvailableEvent,
    MaterialRemovedEvent,
    NewPatientEvent,
    PersonnelAvailableEvent,
    PersonnelRemovedEvent,
    VehicleRemovedEvent,
} from '../../simulation/events';
import { Vehicle } from '../../models/vehicle';
import { Personnel } from '../../models/personnel';
import {
    removeOmittedVehicle,
    insertVehicle,
} from '../../state-helpers/standin-helpers/omission';
import {
    IsElementSet,
    elementSetAllowedValues,
} from '../../utils/validators/is-element-set';
import type { StandInElement } from '../../models/simulated-region-standin';
import {
    currentCoordinatesOf,
    currentSimulatedRegionIdOf,
    currentSimulatedRegionOf,
    isInSimulatedRegion,
    isInSpecificSimulatedRegion,
    isInTransfer,
    isInVehicle,
    isOnMap,
} from '../../models/utils/position/position-helpers';
import { MapCoordinates } from '../../models/utils/position/map-coordinates';
import {
    ExerciseOccupation,
    occupationTypeOptions,
} from '../../models/utils/occupations/exercise-occupation';
import { VehiclePosition } from '../../models/utils/position/vehicle-position';
import { MapPosition } from '../../models/utils/position/map-position';
import { SimulatedRegionPosition } from '../../models/utils/position/simulated-region-position';
import { changeOccupation } from '../../models/utils/occupations/occupation-helpers-mutable';
import {
    VehicleAssociatedElements,
    getAssociatedElementIds,
} from '../../state-helpers/standin-helpers/association';
import { logVehicleAdded, logVehicleRemoved } from './utils/log';
import { removeElementPosition } from './utils/spatial-elements';
import { getElement } from './utils/get-element';
import { completelyLoadVehicle as completelyLoadVehicleHelper } from './utils/completely-load-vehicle';
import { deletePatient } from './patient';

/**
 * Performs all necessary actions to remove a vehicle from the state.
 * This includes removing the material, personnel and (if there are some) patients and sending removed events for those elements if the vehicle is in a simulated region.
 * @param vehicleId The ID of the vehicle to be deleted
 */
export function deleteVehicle(
    draftState: Mutable<ExerciseState>,
    vehicleId: UUID,
    associatedElementIds:
        | {
              [key in ElementTypePluralMap[Exclude<
                  StandInElement['type'],
                  'vehicle'
              >]]?: UUIDSet;
          }
) {
    logVehicleRemoved(draftState, vehicleId);
    let vehicle;
    try {
        vehicle = getElement(draftState, 'vehicle', vehicleId);
    } catch (e: unknown) {
        if (e instanceof ElementOmittedError) {
            removeOmittedVehicle(
                e.omittingRegion,
                vehicleId,
                associatedElementIds
            );
        }
        return;
    }

    // Protect against race conditions
    const actualAssociatedElements = getAssociatedElementIds(vehicle);
    if (
        StrictObject.entries(actualAssociatedElements).some(([k, ids]) =>
            StrictObject.keys(ids).some((id) => !associatedElementIds[k]?.[id])
        ) ||
        StrictObject.entries(associatedElementIds).some(([k, ids]) =>
            StrictObject.keys(ids!).some(
                (id) => !actualAssociatedElements[k][id]
            )
        )
    ) {
        throw new ReducerError(
            `Deleting vehicle failed: AssociatedElements do not match`
        );
    }

    // Delete related material and personnel
    Object.keys(vehicle.materialIds).forEach((materialId) => {
        const material = getElement(draftState, 'material', materialId);
        if (isInSimulatedRegion(material)) {
            const simulatedRegion = currentSimulatedRegionOf(
                draftState,
                material
            );
            sendSimulationEvent(
                simulatedRegion,
                MaterialRemovedEvent.create(materialId)
            );
        }

        removeElementPosition(draftState, 'material', materialId);
        delete draftState.materials[materialId];
    });

    Object.keys(vehicle.personnelIds).forEach((personnelId) => {
        const personnel = getElement(draftState, 'personnel', personnelId);
        if (isInSimulatedRegion(personnel)) {
            const simulatedRegion = currentSimulatedRegionOf(
                draftState,
                personnel
            );
            sendSimulationEvent(
                simulatedRegion,
                PersonnelRemovedEvent.create(personnelId)
            );
        }

        removeElementPosition(draftState, 'personnel', personnelId);
        delete draftState.personnel[personnelId];
    });

    Object.keys(vehicle.patientIds).forEach((patientId) => {
        // The PatientRemovedEvent will be sent by the function below, so we don't have to do it here
        deletePatient(draftState, patientId);
    });

    if (isInSimulatedRegion(vehicle)) {
        const simulatedRegion = currentSimulatedRegionOf(draftState, vehicle);
        sendSimulationEvent(
            simulatedRegion,
            VehicleRemovedEvent.create(vehicleId)
        );
    }

    // Delete the vehicle
    delete draftState.vehicles[vehicleId];
}

export class AddVehicleAction implements Action {
    @IsValue('[Vehicle] Add vehicle' as const)
    public readonly type = '[Vehicle] Add vehicle';
    @ValidateNested()
    @Type(() => Vehicle)
    public readonly vehicle!: Vehicle;

    @IsArray()
    @ValidateNested()
    @Type(() => Material)
    public readonly materials!: readonly Material[];

    @IsArray()
    @ValidateNested()
    @Type(() => Personnel)
    public readonly personnel!: readonly Personnel[];
}

export class RenameVehicleAction implements Action {
    @IsValue('[Vehicle] Rename vehicle' as const)
    public readonly type = '[Vehicle] Rename vehicle';
    @IsUUID(4, uuidValidationOptions)
    public readonly vehicleId!: UUID;

    @IsString()
    public readonly name!: string;
}

export class MoveVehicleAction implements Action {
    @IsValue('[Vehicle] Move vehicle' as const)
    public readonly type = '[Vehicle] Move vehicle';

    @IsUUID(4, uuidValidationOptions)
    public readonly vehicleId!: UUID;

    @ValidateNested()
    @Type(() => MapCoordinates)
    public readonly targetPosition!: MapCoordinates;
}

export class RemoveVehicleAction implements Action {
    @IsValue('[Vehicle] Remove vehicle' as const)
    public readonly type = '[Vehicle] Remove vehicle';
    @IsUUID(4, uuidValidationOptions)
    public readonly vehicleId!: UUID;

    @IsElementSet(elementSetAllowedValues)
    public readonly associatedElements: {
        [key in ElementTypePluralMap[Exclude<
            StandInElement['type'],
            'vehicle'
        >]]?: UUIDSet;
    } = {};
}

export class UnloadVehicleAction implements Action {
    @IsValue('[Vehicle] Unload vehicle' as const)
    public readonly type = '[Vehicle] Unload vehicle';
    @IsUUID(4, uuidValidationOptions)
    public readonly vehicleId!: UUID;
}

export class LoadVehicleAction implements Action {
    @IsValue('[Vehicle] Load vehicle' as const)
    public readonly type = '[Vehicle] Load vehicle';

    @IsUUID(4, uuidValidationOptions)
    public readonly vehicleId!: UUID;

    @IsLiteralUnion({
        material: true,
        patient: true,
        personnel: true,
    })
    public readonly elementToBeLoadedType!:
        | 'material'
        | 'patient'
        | 'personnel';

    @IsUUID(4, uuidValidationOptions)
    public readonly elementToBeLoadedId!: UUID;
}

export class CompletelyLoadVehicleAction implements Action {
    @IsValue('[Vehicle] Completely load vehicle' as const)
    public readonly type = '[Vehicle] Completely load vehicle';
    @IsUUID(4, uuidValidationOptions)
    public readonly vehicleId!: UUID;
}

export class RemoveVehicleFromSimulatedRegionAction implements Action {
    @IsValue('[Vehicle] Remove from simulated region' as const)
    public readonly type = '[Vehicle] Remove from simulated region';

    @IsUUID(4, uuidValidationOptions)
    public readonly vehicleId!: UUID;

    @IsUUID(4, uuidValidationOptions)
    public readonly simulatedRegionId!: UUID;

    @Type(() => Vehicle)
    @ValidateNested()
    public readonly beforeVehicle!: Vehicle;

    @Allow()
    public readonly beforeAssociatedElements!: VehicleAssociatedElements;
}

export class SetVehicleOccupationAction implements Action {
    @IsValue('[Vehicle] Set occupation' as const)
    public readonly type = '[Vehicle] Set occupation';

    @IsUUID(4, uuidValidationOptions)
    public readonly vehicleId!: UUID;

    @Type(...occupationTypeOptions)
    @ValidateNested()
    public readonly occupation!: ExerciseOccupation;
}

export namespace VehicleActionReducers {
    export const addVehicle: ActionReducer<AddVehicleAction> = {
        action: AddVehicleAction,
        reducer: (draftState, { vehicle, materials, personnel }) => {
            if (
                materials.some(
                    (material) =>
                        material.vehicleId !== vehicle.id ||
                        vehicle.materialIds[material.id] === undefined
                ) ||
                StrictObject.keys(vehicle.materialIds).length !==
                    materials.length
            ) {
                throw new ReducerError(
                    'Vehicle material ids do not match material ids'
                );
            }
            if (
                personnel.some(
                    (currentPersonnel) =>
                        currentPersonnel.vehicleId !== vehicle.id ||
                        vehicle.personnelIds[currentPersonnel.id] === undefined
                ) ||
                StrictObject.keys(vehicle.personnelIds).length !==
                    personnel.length
            ) {
                throw new ReducerError(
                    'Vehicle personnel ids do not match personnel ids'
                );
            }
            draftState.vehicles[vehicle.id] = cloneDeepMutable(vehicle);
            for (const material of cloneDeepMutable(materials)) {
                changePosition(
                    material,
                    VehiclePosition.create(vehicle.id),
                    draftState
                );
                draftState.materials[material.id] = material;
            }
            for (const person of cloneDeepMutable(personnel)) {
                changePosition(
                    person,
                    VehiclePosition.create(vehicle.id),
                    draftState
                );
                draftState.personnel[person.id] = person;
            }

            logVehicleAdded(draftState, vehicle.id);

            return draftState;
        },
        rights: 'trainer',
    };

    export const moveVehicle: ActionReducer<MoveVehicleAction> = {
        action: MoveVehicleAction,
        reducer: (draftState, { vehicleId, targetPosition }) => {
            changePositionWithId(
                vehicleId,
                MapPosition.create(targetPosition),
                'vehicle',
                draftState
            );
            return draftState;
        },
        rights: 'participant',
    };

    export const renameVehicle: ActionReducer<RenameVehicleAction> = {
        action: RenameVehicleAction,
        reducer: (draftState, { vehicleId, name }) => {
            const vehicle = getElement(draftState, 'vehicle', vehicleId);
            vehicle.name = name;
            for (const personnelId of Object.keys(vehicle.personnelIds)) {
                draftState.personnel[personnelId]!.vehicleName = name;
            }
            for (const materialId of Object.keys(vehicle.materialIds)) {
                draftState.materials[materialId]!.vehicleName = name;
            }
            return draftState;
        },
        rights: 'trainer',
    };

    export const removeVehicle: ActionReducer<RemoveVehicleAction> = {
        action: RemoveVehicleAction,
        reducer: (draftState, { vehicleId, associatedElements }) => {
            deleteVehicle(draftState, vehicleId, associatedElements);
            return draftState;
        },
        rights: 'trainer',
    };

    export const unloadVehicle: ActionReducer<UnloadVehicleAction> = {
        action: UnloadVehicleAction,
        reducer: (draftState, { vehicleId }) => {
            const vehicle = getElement(draftState, 'vehicle', vehicleId);

            if (!isOnMap(vehicle) && !isInSimulatedRegion(vehicle)) {
                throw new ReducerError(
                    `Vehicle with id ${vehicleId} is currently not on the map or in a simulated region`
                );
            }

            const materialIds = Object.keys(vehicle.materialIds);
            const personnelIds = Object.keys(vehicle.personnelIds);
            const patientIds = Object.keys(vehicle.patientIds);

            if (isOnMap(vehicle)) {
                const unloadPosition = currentCoordinatesOf(vehicle);
                const vehicleWidthInPosition = imageSizeToPosition(
                    vehicle.image.aspectRatio * vehicle.image.height
                );

                const space =
                    vehicleWidthInPosition /
                    (personnelIds.length +
                        materialIds.length +
                        patientIds.length +
                        1);
                let x = unloadPosition.x - vehicleWidthInPosition / 2;

                // Unload all patients, personnel and material and put them on the vehicle

                for (const patientId of patientIds) {
                    x += space;
                    changePositionWithId(
                        patientId,
                        MapPosition.create(
                            MapCoordinates.create(x, unloadPosition.y)
                        ),
                        'patient',
                        draftState
                    );
                    delete vehicle.patientIds[patientId];
                }

                for (const personnelId of personnelIds) {
                    x += space;
                    const personnel = getElement(
                        draftState,
                        'personnel',
                        personnelId
                    );
                    if (isInVehicle(personnel)) {
                        changePositionWithId(
                            personnelId,
                            MapPosition.create(
                                MapCoordinates.create(x, unloadPosition.y)
                            ),
                            'personnel',
                            draftState
                        );
                    }
                }

                for (const materialId of materialIds) {
                    x += space;
                    const material = getElement(
                        draftState,
                        'material',
                        materialId
                    );
                    if (isInVehicle(material)) {
                        changePosition(
                            material,
                            MapPosition.create(
                                MapCoordinates.create(x, unloadPosition.y)
                            ),
                            draftState
                        );
                    }
                }
            } else {
                const simulatedRegionId = currentSimulatedRegionIdOf(vehicle);

                const simulatedRegion = getElement(
                    draftState,
                    'simulatedRegion',
                    simulatedRegionId
                );

                for (const patientId of patientIds) {
                    changePositionWithId(
                        patientId,
                        SimulatedRegionPosition.create(simulatedRegionId),
                        'patient',
                        draftState
                    );
                    sendSimulationEvent(
                        simulatedRegion,
                        NewPatientEvent.create(patientId)
                    );
                    delete vehicle.patientIds[patientId];
                }

                for (const personnelId of personnelIds) {
                    const personnel = getElement(
                        draftState,
                        'personnel',
                        personnelId
                    );

                    if (isInVehicle(personnel)) {
                        changePositionWithId(
                            personnelId,
                            SimulatedRegionPosition.create(simulatedRegionId),
                            'personnel',
                            draftState
                        );
                        sendSimulationEvent(
                            simulatedRegion,
                            PersonnelAvailableEvent.create(personnelId)
                        );
                    }
                }

                for (const materialId of materialIds) {
                    const material = getElement(
                        draftState,
                        'material',
                        materialId
                    );

                    if (isInVehicle(material)) {
                        changePosition(
                            material,
                            SimulatedRegionPosition.create(simulatedRegionId),
                            draftState
                        );
                        sendSimulationEvent(
                            simulatedRegion,
                            MaterialAvailableEvent.create(materialId)
                        );
                    }
                }
            }

            return draftState;
        },
        rights: 'participant',
    };

    export const loadVehicle: ActionReducer<LoadVehicleAction> = {
        action: LoadVehicleAction,
        reducer: (
            draftState,
            { vehicleId, elementToBeLoadedId, elementToBeLoadedType }
        ) => {
            const vehicle = getElement(draftState, 'vehicle', vehicleId);
            switch (elementToBeLoadedType) {
                case 'material': {
                    const material = getElement(
                        draftState,
                        'material',
                        elementToBeLoadedId
                    );
                    if (!vehicle.materialIds[elementToBeLoadedId]) {
                        throw new ReducerError(
                            `Material with id ${material.id} is not assignable to the vehicle with id ${vehicle.id}`
                        );
                    }
                    changePosition(
                        material,
                        VehiclePosition.create(vehicleId),
                        draftState
                    );
                    break;
                }
                case 'personnel': {
                    const personnel = getElement(
                        draftState,
                        'personnel',
                        elementToBeLoadedId
                    );
                    if (isInTransfer(personnel)) {
                        throw new ReducerError(
                            `Personnel with id ${elementToBeLoadedId} is currently in transfer`
                        );
                    }
                    if (!vehicle.personnelIds[elementToBeLoadedId]) {
                        throw new ReducerError(
                            `Personnel with id ${personnel.id} is not assignable to the vehicle with id ${vehicle.id}`
                        );
                    }
                    changePosition(
                        personnel,
                        VehiclePosition.create(vehicleId),
                        draftState
                    );
                    break;
                }
                case 'patient': {
                    const patient = getElement(
                        draftState,
                        'patient',
                        elementToBeLoadedId
                    );
                    if (
                        Object.keys(vehicle.patientIds).length >=
                        vehicle.patientCapacity
                    ) {
                        throw new ReducerError(
                            `Vehicle with id ${vehicle.id} is already full`
                        );
                    }
                    vehicle.patientIds[elementToBeLoadedId] = true;
                    changePosition(
                        patient,
                        VehiclePosition.create(vehicleId),
                        draftState
                    );

                    completelyLoadVehicleHelper(draftState, vehicle);
                }
            }
            return draftState;
        },
        rights: 'participant',
    };

    export const completelyLoadVehicle: ActionReducer<CompletelyLoadVehicleAction> =
        {
            action: CompletelyLoadVehicleAction,
            reducer: (draftState, { vehicleId }) => {
                const vehicle = getElement(draftState, 'vehicle', vehicleId);
                completelyLoadVehicleHelper(draftState, vehicle);

                return draftState;
            },
            rights: 'trainer',
        };

    export const removeVehicleFromSimulatedRegion: ActionReducer<RemoveVehicleFromSimulatedRegionAction> =
        {
            action: RemoveVehicleFromSimulatedRegionAction,
            reducer: (
                draftState,
                {
                    vehicleId,
                    simulatedRegionId,
                    beforeVehicle,
                    beforeAssociatedElements,
                }
            ) => {
                let vehicle: Mutable<Vehicle>;
                try {
                    vehicle = getElement(draftState, 'vehicle', vehicleId);
                } catch (err: unknown) {
                    if (
                        err instanceof ElementOmittedError &&
                        err.elementType === 'vehicle'
                    ) {
                        vehicle = cloneDeepMutable(beforeVehicle);
                        insertVehicle(
                            draftState,
                            err.omittingRegion,
                            vehicle,
                            cloneDeepMutable(beforeAssociatedElements)
                        );
                    } else {
                        throw err;
                    }
                }

                if (!isInSpecificSimulatedRegion(vehicle, simulatedRegionId)) {
                    throw new ReducerError(
                        `Vehicle with id ${vehicleId} has to be in simulated region with id ${simulatedRegionId} to be removed from there.`
                    );
                }

                completelyLoadVehicleHelper(draftState, vehicle);

                const simulatedRegion = currentSimulatedRegionOf(
                    draftState,
                    vehicle
                );
                sendSimulationEvent(
                    simulatedRegion,
                    VehicleRemovedEvent.create(vehicleId)
                );

                const coordinates = cloneDeepMutable(
                    currentCoordinatesOf(simulatedRegion)
                );

                // place the vehicle on the right hand side of the simulated region
                coordinates.y -= 0.5 * simulatedRegion.size.height;
                coordinates.x += 5 + Math.max(simulatedRegion.size.width, 0);

                changePositionWithId(
                    vehicleId,
                    MapPosition.create(coordinates),
                    'vehicle',
                    draftState
                );

                return draftState;
            },
            rights: 'trainer',
        };

    export const setVehicleOccupation: ActionReducer<SetVehicleOccupationAction> =
        {
            action: SetVehicleOccupationAction,
            reducer: (draftState, { vehicleId, occupation }) => {
                const vehicle = getElement(draftState, 'vehicle', vehicleId);
                changeOccupation(draftState, vehicle, occupation);
                return draftState;
            },
            rights: 'trainer',
        };
}
