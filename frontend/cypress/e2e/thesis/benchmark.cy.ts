import { StateExport } from 'digital-fuesim-manv-shared';
import { ScenarioBuilder } from '../../../benchmark/scenario-generator';
import { perRegionTabs } from './utils';

describe('load benchmark exercise', () => {
    beforeEach(() => {
        const builder = new ScenarioBuilder();
        for (let i = 0; i < 50; i++) {
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
        cy.get('[data-cy=trainerToolbarExecutionButton]').click();
        cy.get('button:contains(Simulationsübersicht)').click();

        perRegionTabs.forEach((selector) => {
            cy.get(selector).last().click();
            cy.wait(1_000);
        });
    });
});
