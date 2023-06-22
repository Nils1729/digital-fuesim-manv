import { createReducer, on } from '@ngrx/store';
import type { ExerciseState } from 'digital-fuesim-manv-shared';
import {
    ElementOmittedError,
    reduceExerciseState,
    ReducerError,
    SimulatedRegionMissingError,
    addAssociatedElements,
    omitAssociatedElementsForRegion,
} from 'digital-fuesim-manv-shared';
import {
    createApplyServerActionAction,
    createJoinExerciseAction,
    createJumpToTimeAction,
    createLeaveExerciseAction,
    createReplaceRegionWithStandInAction,
    createRestoreRegionStandInAction,
    createSetExerciseStateAction,
    createStartTimeTravelAction,
} from './application.actions';
import { ApplicationState } from './application.state';

export const applicationReducer = createReducer(
    new ApplicationState(),
    on(createSetExerciseStateAction, (state, { exercise }) => ({
        ...state,
        exerciseState: exercise,
    })),
    on(createApplyServerActionAction, (state, { serverAction }) => {
        let newExerciseState: ExerciseState | undefined;
        try {
            newExerciseState = reduceExerciseState(
                state.exerciseState!,
                serverAction
            );
        } catch (error: any) {
            if (error instanceof SimulatedRegionMissingError) {
                console.error(
                    `Error while applying server action: Simulated Region with ID ${error.simulatedRegionId} is currently not loaded.`,
                    error
                );
            } else if (error instanceof ElementOmittedError) {
                console.warn(
                    `Element of type ${error.elementType} with id ${error.elementId} was omitted`
                );
                return state;
            } else if (error instanceof ReducerError) {
                console.warn(
                    `Error while applying server action: ${error.message} \n
                            This is expected if an optimistic update has been applied.`
                );
                // If the reducer throws an error (which is expected due to optimistic updates), we don't change the state
                return state;
            }
            throw error;
        }
        return {
            ...state,
            exerciseState: newExerciseState,
        };
    }),
    on(
        createStartTimeTravelAction,
        (state, { initialExerciseState, endTime }) => ({
            ...state,
            exerciseState: initialExerciseState,
            exerciseStateMode: 'timeTravel',
            timeConstraints: {
                start: initialExerciseState.currentTime,
                current: initialExerciseState.currentTime,
                end: endTime,
            },
        })
    ),
    on(
        createJumpToTimeAction,
        (state, { exerciseTime, exerciseStateAtTime }) => ({
            ...state,
            exerciseState: exerciseStateAtTime,
            timeConstraints: {
                ...state.timeConstraints!,
                current: exerciseTime,
            },
        })
    ),
    on(
        createJoinExerciseAction,
        (state, { ownClientId, exerciseId, clientName, exerciseState }) => ({
            ...state,
            exerciseState,
            exerciseStateMode: 'exercise',
            exerciseId,
            ownClientId,
            lastClientName: clientName,
        })
    ),
    on(createLeaveExerciseAction, (state) => ({
        ...state,
        exerciseStateMode: undefined,
    })),
    on(
        createReplaceRegionWithStandInAction,
        (state, { simulatedRegionId }) => ({
            ...state,
            exerciseState: omitAssociatedElementsForRegion(
                state.exerciseState!,
                simulatedRegionId
            ),
        })
    ),
    on(createRestoreRegionStandInAction, (state, associatedElements) => ({
        ...state,
        exerciseState: addAssociatedElements(
            state.exerciseState!,
            associatedElements
        ),
    }))
);
