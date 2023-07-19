import cypress from 'cypress';
import { ExerciseConfiguration } from 'digital-fuesim-manv-shared';

const implementations: { name: string; host: string; root: string }[] = [
    {
        name: 'test',
        host: 'http://dfm-main',
        root: 'scenarios/thesis',
    },
    {
        name: 'control',
        host: 'http://dfm-thesis',
        root: 'scenarios/main',
    },
];

implementations.forEach(({ host, name, root }) => {
    describe(
        `execute scenarios for ${name}`,
        {
            baseUrl: host,
        },
        () => {
            const timings: any = [];
            const settings: {
                filename?: string;
                pas: number;
                loaded_pas: number;
                fraction_pas: number;
                ticks: number;
                run: number;
                config: ExerciseConfiguration['standInConfig'];
            }[] = require(`../${root}/settings.json`);

            settings.forEach(
                ({
                    filename,
                    pas,
                    loaded_pas,
                    fraction_pas,
                    ticks,
                    run,
                    config,
                }) => {
                    it(`records ${ticks} ticks with ${pas} regions, ${loaded_pas} loaded (${run})`, () => {
                        cy.visit('/').reload(true);
                        cy.readFile(`${root}/${filename}`).then((body) => {
                            cy.createExerciseProduction(
                                body
                            ).joinExerciseAsTrainer();
                            cy.log('start an exercise')
                                .get('[data-cy=trainerToolbarStartButton]', {
                                    timeout: 10_000,
                                })
                                .click();
                            cy.get(
                                '[data-cy=confirmationModalOkButton]'
                            ).click();
                            cy.wait(5_000);

                            cy.actionTiming().then((a) => a.clear());

                            cy.actionTiming()
                                .its('sampleCount', { timeout: ticks * 1_500 })
                                .should('be.at.least', ticks + 1);
                            cy.actionTiming().then((a) => {
                                timings.push({
                                    settings: {
                                        pas,
                                        loaded_pas,
                                        fraction_pas,
                                        ticks,
                                        run,
                                        config,
                                    },
                                    stats: a.series_stats(ticks),
                                    raw: a.series(ticks),
                                });
                            });
                        });
                    });
                }
            );

            it('saves recorded timings', () => {
                cy.writeFile(
                    `data/${root}/${new Date().toISOString()}.json`,
                    timings
                );
            });
        }
    );
});
