import { StateExport } from 'digital-fuesim-manv-shared';
import { ScenarioBuilder } from '../../../benchmark/scenario-generator';
import { perRegionTabs } from './utils';

describe('load benchmark exercise', () => {
    const num_pas = 50;
    beforeEach(() => {
        const builder = new ScenarioBuilder();
        for (let i = 0; i < num_pas; i++) {
            builder.addFullPatientTray(i);
        }
        const body = new StateExport(builder.build());
        cy.writeFile('./scenario.json', body);
        cy.reload(true)
            .createExercise(body)
            .wait(1_000)
            .joinExerciseAsTrainer()
            .initializeTrainerSocket();
    });
    it('clicks all tabs', () => {
        cy.log('start an exercise')
            .get('[data-cy=trainerToolbarStartButton]')
            .click();
        cy.get('[data-cy=confirmationModalOkButton]').click();
        cy.get('[data-cy=trainerToolbarExecutionButton]').click();
        cy.get('button:contains(Simulationsübersicht)').click();
        cy.wait(60_000)

        const clickTabs = () =>
            perRegionTabs.forEach((selector) => {
                cy.get(selector).last().click();
                cy.wait(200);
            });
        for (let i = 0; i < num_pas; i++) {
            cy.get(`[data-cy=simulationOverviewRegionTab]`).eq(i).click();
            clickTabs();
            cy.wait(1_000);
        }
    });
});
