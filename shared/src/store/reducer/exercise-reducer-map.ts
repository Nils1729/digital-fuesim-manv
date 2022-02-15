/* eslint-disable @typescript-eslint/no-throw-literal */
import _ from 'lodash';
import type { ExerciseAction } from '..';
import { imageSizeToPosition, StatusHistoryEntry } from '../..';
import type { ReducerFunction } from './reducer-function';
import { calculateTreatments } from './calculate-treatments';
import { ReducerError } from '.';

/**
 * Here are all the reducers for the exercise state specified.
 * The key is the action type and the value is the reducer function.
 */
export const exerciseReducerMap: {
    [Action in ExerciseAction as Action['type']]: ReducerFunction<Action>;
} = {
    '[Viewport] Add viewport': (draftState, { viewport }) => {
        draftState.viewports[viewport.id] = viewport;
        return draftState;
    },
    '[Viewport] Remove viewport': (draftState, { viewportId }) => {
        if (!draftState.viewports[viewportId]) {
            throw new ReducerError(
                `Viewport with id ${viewportId} does not exist`
            );
        }
        delete draftState.viewports[viewportId];
        return draftState;
    },
    '[Patient] Add patient': (draftState, { patient }) => {
        draftState.patients[patient.id] = _.cloneDeep(patient);
        calculateTreatments(draftState);
        return draftState;
    },
    '[Patient] Move patient': (draftState, { patientId, targetPosition }) => {
        const patient = draftState.patients[patientId];
        if (!patient) {
            throw new ReducerError(
                `Patient with id ${patientId} does not exist`
            );
        }
        patient.position = targetPosition;
        calculateTreatments(draftState);
        return draftState;
    },
    '[Patient] Remove patient': (draftState, { patientId }) => {
        if (!draftState.patients[patientId]) {
            throw new ReducerError(
                `Patient with id ${patientId} does not exist`
            );
        }
        delete draftState.patients[patientId];
        calculateTreatments(draftState);
        return draftState;
    },
    '[Vehicle] Add vehicle': (draftState, { vehicle, material, personell }) => {
        draftState.vehicles[vehicle.id] = vehicle;
        draftState.materials[material.id] = material;
        for (const person of personell) {
            draftState.personell[person.id] = person;
        }
        return draftState;
    },
    '[Vehicle] Move vehicle': (draftState, { vehicleId, targetPosition }) => {
        const vehicle = draftState.vehicles[vehicleId];
        if (!vehicle) {
            throw new ReducerError(
                `Vehicle with id ${vehicleId} does not exist`
            );
        }
        vehicle.position = targetPosition;
        return draftState;
    },
    '[Vehicle] Unload vehicle': (draftState, { vehicleId }) => {
        const vehicle = draftState.vehicles[vehicleId];
        if (!vehicle) {
            throw new ReducerError(
                `Vehicle with id ${vehicleId} does not exist`
            );
        }
        const unloadPosition = vehicle.position;
        if (!unloadPosition) {
            throw new ReducerError(
                `Vehicle with id ${vehicleId} is currently in transfer`
            );
        }
        const material = draftState.materials[vehicle.materialId];
        const personnel = Object.keys(vehicle.personellIds).map(
            (personnelId) => draftState.personell[personnelId]
        );
        // TODO: save in the elements themselves
        const vehicleImageWidth = 200;
        const vehicleWidthInPosition = imageSizeToPosition(vehicleImageWidth);
        const numberOfMaterial = 1;
        const space =
            vehicleWidthInPosition / (personnel.length + numberOfMaterial + 1);
        let x = unloadPosition.x - vehicleWidthInPosition / 2;

        for (const person of personnel) {
            x += space;
            // TODO: only if the person is not in transfer
            person.position ??= {
                x,
                y: unloadPosition.y,
            };
        }
        x += space;
        material.position ??= {
            x,
            y: unloadPosition.y,
        };
        calculateTreatments(draftState);
        return draftState;
    },
    '[Vehicle] Remove vehicle': (draftState, { vehicleId }) => {
        if (!draftState.vehicles[vehicleId]) {
            throw new ReducerError(
                `Vehicle with id ${vehicleId} does not exist`
            );
        }
        delete draftState.vehicles[vehicleId];
        return draftState;
    },
    '[Personell] Move personell': (
        draftState,
        { personellId, targetPosition }
    ) => {
        const personell = draftState.personell[personellId];
        if (!personell) {
            throw new ReducerError(
                `Personell with id ${personellId} does not exist`
            );
        }
        personell.position = targetPosition;
        calculateTreatments(draftState);
        return draftState;
    },
    '[Material] Move material': (
        draftState,
        { materialId, targetPosition }
    ) => {
        const material = draftState.materials[materialId];
        if (!material) {
            throw new ReducerError(
                `Material with id ${materialId} does not exist`
            );
        }
        material.position = targetPosition;
        calculateTreatments(draftState);
        return draftState;
    },
    '[Client] Add client': (draftState, { client }) => {
        draftState.clients[client.id] = client;
        return draftState;
    },
    '[Client] Remove client': (draftState, { clientId }) => {
        if (!draftState.clients[clientId]) {
            throw new ReducerError(`Client with id ${clientId} does not exist`);
        }
        delete draftState.clients[clientId];
        return draftState;
    },
    '[Client] Restrict to viewport': (draftState, { clientId, viewportId }) => {
        if (!draftState.clients[clientId]) {
            throw new ReducerError(`Client with id ${clientId} does not exist`);
        }
        if (viewportId === undefined) {
            draftState.clients[clientId].viewRestrictedToViewportId =
                viewportId;
            return draftState;
        }
        if (!draftState.viewports[viewportId]) {
            throw new ReducerError(
                `Viewport with id ${viewportId} does not exist`
            );
        }
        draftState.clients[clientId].viewRestrictedToViewportId = viewportId;
        return draftState;
    },
    '[Client] Set waitingroom': (
        draftState,
        { clientId, shouldBeInWaitingRoom }
    ) => {
        if (!draftState.clients[clientId]) {
            throw new ReducerError(`Client with id ${clientId} does not exist`);
        }
        draftState.clients[clientId].isInWaitingRoom = shouldBeInWaitingRoom;
        return draftState;
    },
    '[Exercise] Pause': (draftState, { timestamp }) => {
        const statusHistoryEntry = new StatusHistoryEntry(
            'paused',
            new Date(timestamp)
        );

        draftState.statusHistory.push(statusHistoryEntry);

        return draftState;
    },
    '[Exercise] Start': (draftState, { timestamp }) => {
        const statusHistoryEntry = new StatusHistoryEntry(
            'running',
            new Date(timestamp)
        );

        draftState.statusHistory.push(statusHistoryEntry);

        return draftState;
    },
    '[Exercise] Set Participant Id': (draftState, { participantId }) => {
        draftState.participantId = participantId;
        return draftState;
    },
};
