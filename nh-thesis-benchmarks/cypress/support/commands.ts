import {
    UUID,
    SocketResponse,
    ExerciseAction,
    StateExport,
    SimulatedRegion,
} from 'digital-fuesim-manv-shared';
import { io } from 'socket.io-client';
import { ActionTiming } from '../../../frontend/src/app/shared/benchmark-data';
import { ScenarioBuilder } from '../../src/scenario-generator';
import { stereotypes } from '../../../frontend/src/app/pages/exercises/exercise/shared/editor-panel/templates/simulated-region';

declare global {
    interface Window {
        __thesis: {
            actionTiming: ActionTiming;
        };
    }
}

namespace CustomCommands {
    export function dragToMap(
        elementSelector: string,
        offset?: { x: number; y: number }
    ) {
        const mapSelector = '[data-cy=openLayersContainer]';

        cy.get(elementSelector).first().trigger('mousedown');

        return (
            cy
                .get(mapSelector)
                /**
                 * We have to force the click here, as the img
                 * of the element being dragged is in front of the map
                 **/
                .trigger('mousemove', { force: true, ...offset })
                .click({ force: true })
        );
    }

    export function store() {
        return cy.window().its('cypressTestingValues').its('store');
    }

    export function thesis() {
        return cy.window().its('__thesis');
    }

    export function actionTiming(options?) {
        return cy.thesis().its('actionTiming', options);
    }

    export function getState() {
        return cy.wrap(
            new Promise((resolve) => {
                cy.store()
                    .invoke('select', 'application')
                    .invoke('subscribe', (state: any) => resolve(state))
                    .log('get state');
            })
        );
    }

    export function createExercise(stateExport?: object) {
        cy.visit('/');
        cy.window()
            .its('cypressTestingValues')
            .its('backendBaseUrl')
            .as('backendBaseUrl');
        cy.window()
            .its('cypressTestingValues')
            .its('websocketBaseUrl')
            .as('websocketBaseUrl');

        cy.get('@backendBaseUrl').then((backendBaseUrl) => {
            cy.request('POST', `${backendBaseUrl}/api/exercise`, stateExport)
                .its('body')
                .as('createBody');
        });
        cy.get('@createBody').its('trainerId').as('trainerId');
        cy.get('@createBody').its('participantId').as('participantId');
        return cy;
    }

    export function joinExerciseAsTrainer() {
        cy.get('@trainerId').then((trainerId) =>
            cy.visit(`exercises/${trainerId}`)
        );
        cy.wait(1_000);
        cy.get('[data-cy=joinExerciseModalButton]').click();
        return cy;
    }

    export function joinExerciseAsParticipant() {
        cy.get('@participantId').then((participantId) =>
            cy.visit(`exercises/${participantId}`)
        );
        cy.get('[data-cy=joinExerciseModalButton]').click();
        return cy;
    }

    export function initializeParticipantSocket() {
        cy.get('@websocketBaseUrl').then((websocketBaseUrl: any) => {
            cy.wrap(io(websocketBaseUrl, { transports: ['websocket'] })).as(
                'participantSocket'
            );
        });

        cy.get('@participantId').then((participantId: any) => {
            cy.get('@participantSocket').then((participantSocket: any) => {
                cy.wrap(
                    new Promise<SocketResponse<UUID>>((resolve) => {
                        participantSocket.emit(
                            'joinExercise',
                            participantId,
                            '',
                            (response: SocketResponse<UUID>) =>
                                resolve(response)
                        );
                    })
                )
                    .its('payload')
                    .as('participantSocketUUID');
            });
        });

        cy.wrap([])
            .as('participantSocketPerformedActions')
            .then((performedActions: any) => {
                cy.get('@participantSocket').then((participantSocket: any) => {
                    participantSocket.on(
                        'performAction',
                        (action: ExerciseAction) => {
                            performedActions.push(action);
                        }
                    );
                });
            });

        return cy;
    }

    export function initializeTrainerSocket() {
        cy.get('@websocketBaseUrl').then((websocketBaseUrl: any) => {
            cy.wrap(io(websocketBaseUrl, { transports: ['websocket'] })).as(
                'trainerSocket'
            );
        });

        cy.get('@trainerId').then((trainerId: any) => {
            cy.get('@trainerSocket').then((trainerSocket: any) => {
                cy.wrap(
                    new Promise<SocketResponse<UUID>>((resolve) => {
                        trainerSocket.emit(
                            'joinExercise',
                            trainerId,
                            '',
                            (response: SocketResponse<UUID>) =>
                                resolve(response)
                        );
                    })
                )
                    .its('payload')
                    .as('trainerSocketUUID');
            });
        });

        cy.wrap([])
            .as('trainerSocketPerformedActions')
            .then((performedActions: any) => {
                cy.get('@trainerSocket').then((trainerSocket: any) => {
                    trainerSocket.on(
                        'performAction',
                        (action: ExerciseAction) => {
                            performedActions.push(action);
                        }
                    );
                });
            });

        return cy;
    }

    export function prepareScenario(pa_count, config?) {
        const builder = new ScenarioBuilder();
        for (let i = 0; i < pa_count; i++) {
            builder.addCluster(
                i * stereotypes[0]!.size.width * 2,
                `Cluser ${i}`
            );
            builder.ageTicks(60);
        }
        if (config) builder.setStandInConfig(config);
        const body = new StateExport(builder.build());

        cy.reload(true).createExercise(body).joinExerciseAsTrainer();
        cy.log('start an exercise')
            .get('[data-cy=trainerToolbarStartButton]', { timeout: 10_000 })
            .click();
    }
}

Cypress.Commands.addAll(CustomCommands);
type CC = typeof CustomCommands;
declare global {
    namespace Cypress {
        interface Chainable extends CC {}
    }
}
