import { perRegionTabs } from "./utils";

describe('new exercise', () => {
    beforeEach(() => {
        cy.reload(true)
            .createExercise()
            .wait(1000)
            .joinExerciseAsTrainer()
            .initializeTrainerSocket();
    });
    it('clicks all tabs', () => {
        cy.dragToMap('h5:contains(Patientenablage ???)');
        cy.get('[data-cy=trainerToolbarExecutionButton]').click();
        cy.get('button:contains(Simulationsübersicht)').click();

        perRegionTabs.forEach((selector) => {
            cy.get(selector).last().click();
            cy.wait(200);
        });
    });
});
