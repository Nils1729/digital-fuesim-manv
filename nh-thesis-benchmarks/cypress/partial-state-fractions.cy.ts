import { ExerciseConfiguration } from 'digital-fuesim-manv-shared';

describe('execute some patient ticks', () => {
    const timings: any = [];

    const configs: ExerciseConfiguration['standInConfig'][] = [
        {
            useStandIns: false,
            preComputation: { patients: false, standIns: false },
        },
        {
            useStandIns: false,
            preComputation: { patients: false, standIns: true },
        },
        {
            useStandIns: false,
            preComputation: { patients: true, standIns: false },
        },
        {
            useStandIns: false,
            preComputation: { patients: true, standIns: true },
        },
        {
            useStandIns: true,
            preComputation: { patients: false, standIns: true },
            holdInterval: 1_000_000_000,
            updateInterval: 1_000_000_000,
        },
        {
            useStandIns: true,
            preComputation: { patients: true, standIns: true },
            holdInterval: 1_000_000_000,
            updateInterval: 1_000_000_000,
        },
    ];
    const settings: {
        pas: number;
        loaded_pas: number;
        ticks: number;
        run: number;
        config: ExerciseConfiguration['standInConfig'];
    }[] = [];
    const pa_counts = [20];
    const pa_fractions = [0.25];
    const tick_counts = [10];
    const repetitions = 1;
    for (let i = 0; i < repetitions; i++) {
        tick_counts.forEach((ticks) =>
            pa_counts.forEach((pas) =>
                pa_fractions.forEach((paf) =>
                    settings.push({
                        pas,
                        loaded_pas: pas * paf,
                        ticks,
                        run: i,
                        config: {
                            useStandIns: true,
                            holdInterval: 1_000_000_000,
                            updateInterval: 5,
                            preComputation: { patients: false, standIns: true },
                        },
                    })
                )
            )
        );
    }

    it('checks the frontend is working', () => {
        cy.prepareScenario(0);
        cy.get('[data-cy=confirmationModalOkButton]').click();
        cy.get('span:contains(0:00:10)', { timeout: 15_000 });
    });

    settings.forEach(({ pas, loaded_pas, ticks, run, config }) => {
        it(`records ${ticks} ticks with ${pas} regions, ${loaded_pas} loaded (${
            run + 1
        } / ${repetitions})`, () => {
            cy.preparePartialScenario(pas, loaded_pas, config);
            cy.get('[data-cy=confirmationModalOkButton]').click();
            // cy.get('span:contains(0:00:01)', { timeout: 5_000 });
            cy.get('[data-cy=trainerToolbarExecutionButton]').click();
            cy.get('button:contains(Simulationsübersicht)').click();
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

    it('saves recorded timings', () => {
        cy.writeFile(
            `data/partial-state-fractions/${new Date().toISOString()}.json`,
            timings
        );
    });
});
