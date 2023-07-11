import { ExerciseConfiguration } from 'digital-fuesim-manv-shared';
import { perRegionTabs } from '../src/utils';

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
            holdInterval: 1000,
            updateInterval: 1000,
        },
        {
            useStandIns: true,
            preComputation: { patients: true, standIns: true },
            holdInterval: 1000,
            updateInterval: 1000,
        },
    ];
    const settings: {
        pas: number;
        ticks: number;
        run: number;
        config: ExerciseConfiguration['standInConfig'];
    }[] = [];
    const pa_counts = [5, 10, 20, 21, 30, 31];
    const tick_counts = [300];
    const repetitions = 1;
    for (let i = 0; i < repetitions; i++) {
        tick_counts.forEach((ticks) =>
            pa_counts.forEach((pas) =>
                configs.forEach((config) =>
                    settings.push({ pas, ticks, run: i, config })
                )
            )
        );
    }

    it('checks the frontend is working', () => {
        cy.prepareScenario(0);
        cy.get('[data-cy=confirmationModalOkButton]').click();
        cy.get('span:contains(0:00:10)', { timeout: 15_000 });
    });

    settings.forEach(({ pas, ticks, run, config }) => {
        it(`records ${ticks} ticks with ${pas} full regions (${
            run + 1
        } / ${repetitions})`, () => {
            cy.prepareScenario(pas, config);
            cy.get('[data-cy=confirmationModalOkButton]').click();
            cy.get('span:contains(0:00:01)', { timeout: 5_000 });
            cy.actionTiming().then((a) => a.clear());

            cy.get('[data-cy=trainerToolbarExecutionButton]').click();
            cy.get('button:contains(Simulationsübersicht)').click();

            for (let i = 0; i < ticks; i++) {
                const pa_index = Math.floor(Math.random() * pas);
                cy.get(`[data-cy=simulationOverviewRegionTab]`)
                    .eq(pa_index)
                    .click();
                cy.wait(500);
            }

            cy.actionTiming()
                .its('sampleCount')
                .should('be.at.least', ticks + 1);
            cy.actionTiming().then((a) => {
                timings.push({
                    settings: {
                        pas,
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
            `data/click-tabs/${new Date().toISOString()}.json`,
            timings
        );
    });
});
