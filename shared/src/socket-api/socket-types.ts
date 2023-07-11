import type { ExerciseState } from '../state';
import type { SimRegAssociatedElements } from '../state-helpers';
import type { ExerciseAction } from '../store';
import type { UUID } from '../utils';

export interface ServerToClientEvents {
    performAction: (action: ExerciseAction) => void;
}

// The last argument is always expected to be the callback function. (To be able to use it in advanced typings)
export interface ClientToServerEvents {
    joinExercise: (
        exerciseId: string,
        clientName: string,
        callback: (response: SocketResponse<UUID>) => void
    ) => void;
    proposeAction: (
        action: ExerciseAction,
        callback: (response: SocketResponse) => void
    ) => void;
    getState: (
        callback: (response: SocketResponse<ExerciseState>) => void
    ) => void;
    getPartialState: (
        simulatedRegionId: UUID,
        callback: (response: SocketResponse<SimRegAssociatedElements>) => void
    ) => void;
}

export interface InterServerEvents {}

export interface SocketData {}

export type SocketResponse<T = undefined> =
    | (T extends undefined
          ? {
                readonly success: true;
            }
          : {
                readonly success: true;
                readonly payload: T;
            })
    | {
          readonly success: false;
          readonly message: string;
          readonly expected: boolean;
      };
