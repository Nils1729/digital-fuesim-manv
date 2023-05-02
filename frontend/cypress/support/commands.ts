// ***********************************************
// This example namespace declaration will help
// with Intellisense and code completion in your
// IDE or Text Editor.
// ***********************************************
// declare namespace Cypress {
//   interface Chainable<Subject = any> {
//     customCommand(param: any): typeof customCommand;
//   }
// }
//
// function customCommand(param: any): void {
//   console.warn(param);
// }
//
// NOTE: You can use it like so:
// Cypress.Commands.add('customCommand', customCommand);
//
// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

import type {
    JsonObject,
    UUID,
    SocketResponse,
    ExerciseAction,
} from 'digital-fuesim-manv-shared';
import { io } from 'socket.io-client';

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
                        (response: SocketResponse<UUID>) => resolve(response)
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
                        (response: SocketResponse<UUID>) => resolve(response)
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
                trainerSocket.on('performAction', (action: ExerciseAction) => {
                    performedActions.push(action);
                });
            });
        });

    return cy;
}

export function firstElement(subject: Array<unknown>) {
    return cy.log('first element').wrap(subject.at(0));
}

export function lastElement(subject: Array<unknown>) {
    return cy.log('last element').wrap(subject.at(-1));
}

export function atPosition(subject: Array<unknown>, n: number) {
    return cy.log(`${n}th element`).wrap(subject.at(n));
}

export function atKey(subject: JsonObject, key: string) {
    return cy.log(`atKey ${key}`).wrap(subject[key]);
}

export function itsKeys(subject: JsonObject) {
    return cy.log('its keys').wrap(Object.keys(subject));
}

export function itsValues(subject: JsonObject) {
    return cy.log('its values').wrap(Object.values(subject));
}
