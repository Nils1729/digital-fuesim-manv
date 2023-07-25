import cypress from 'cypress';
import {
    ExerciseAction,
    ExerciseConfiguration,
} from 'digital-fuesim-manv-shared';

const implementations: { name: string; host: string; root: string }[] = [
    {
        name: 'thesis',
        host: 'http://dfm-thesis',
        root: 'scenarios/thesis',
    },
    {
        name: 'thesis-client-patients',
        host: 'http://dfm-thesis',
        root: 'scenarios/thesis-client-patients',
    },
    {
        name: 'main',
        host: 'http://dfm-main',
        root: 'scenarios/main',
    },
    {
        name: 'main-client-patients',
        host: 'http://dfm-client-patients',
        root: 'scenarios/main-client-patients',
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
            const implementation_actions: any = [];
            const settings: {
                filename?: string;
                pas: number;
                loaded_pas: number;
                fraction_pas: number;
                ticks: number;
                run: number;
                config: ExerciseConfiguration['standInConfig'];
            }[] = require(`../${root}/settings.json`);

            const scenario_settings: {
                filename?: string;
                pas: number;
                ticks: number;
                run: number;
                config: ExerciseConfiguration['standInConfig'];
            }[] = require(`../${root}/settings_scenarios.json`);

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
                                .its('sampleCount', { timeout: ticks * 2_000 })
                                .should('be.at.least', ticks + 1);
                            cy.actionTiming().then((actionTiming) => {
                                timings.push({
                                    settings: {
                                        pas,
                                        loaded_pas,
                                        fraction_pas,
                                        ticks,
                                        run,
                                        config,
                                    },
                                    stats: actionTiming.series_stats(ticks),
                                    raw: actionTiming.series(ticks),
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

            scenario_settings.forEach(
                ({ config, pas, run, ticks, filename }) => {
                    it(`collects ${ticks} tick actions with ${pas} regions (${run})`, () => {
                        cy.visit('/').reload(true);
                        cy.readFile(`${root}/${filename}`).then((body) => {
                            cy.createExerciseProduction(body)
                                .joinExerciseAsTrainer()
                                .initializeTrainerSocket();

                            cy.log('start an exercise')
                                .get('[data-cy=trainerToolbarStartButton]', {
                                    timeout: 10_000,
                                })
                                .click();
                            cy.get(
                                '[data-cy=confirmationModalOkButton]'
                            ).click();
                            cy.get('@trainerSocketPerformedActions')
                                .its('length', {
                                    timeout: 10_000,
                                })
                                .should('be.at.least', 5);

                            cy.get('@trainerSocketPerformedActions').then(
                                (ta) => {
                                    (
                                        ta as unknown as ExerciseAction[]
                                    ).length = 0;
                                }
                            );

                            cy.get('@trainerSocketPerformedActions')
                                .its('length', {
                                    timeout: ticks * 2_000,
                                })
                                .should('be.at.least', ticks + 1);
                            cy.get('@trainerSocketPerformedActions').then(
                                (actions) => {
                                    implementation_actions.push({
                                        config,
                                        pas,
                                        run,
                                        ticks,
                                        actions: actions.slice(0, ticks),
                                    });
                                }
                            );
                        });
                    });
                }
            );

            it('saves recorded actions', () => {
                cy.writeFile(
                    `data/${root}/${new Date().toISOString()}_actions.json`,
                    implementation_actions
                );
            });
        }
    );
});
