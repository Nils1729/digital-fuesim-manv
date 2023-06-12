describe('execute some patient ticks', () => {
    const timings: any = [];

    const configurations: { pas: number; ticks: number; run: number }[] = [];
    const pa_counts = [5, 10, 20, 21, 30, 31];
    const tick_counts = [120];
    const repetitions = 2;
    for (let i = 0; i < repetitions; i++) {
        tick_counts.forEach((ticks) =>
            pa_counts.forEach((pas) =>
                configurations.push({ pas, ticks, run: i })
            )
        );
    }

    it('checks the frontend is working', () => {
        cy.prepareScenario(0);
        cy.get('[data-cy=confirmationModalOkButton]').click();
        cy.get('span:contains(0:00:10)', { timeout: 15_000 });
    });

    configurations.forEach(({ pas, ticks, run }) => {
        it(`records ${ticks} ticks with ${pas} full regions`, () => {
            cy.prepareScenario(pas);
            cy.get('[data-cy=confirmationModalOkButton]').click();
            cy.get('span:contains(0:00:01)', { timeout: 5_000 });
            cy.actionTiming().then((a) => a.clear());

            cy.wait(1100 * ticks);
            cy.actionTiming().then((a) => {
                timings.push({
                    settings: {
                        pas,
                        ticks,
                        run,
                    },
                    stats: a.series_stats(ticks),
                    raw: a.series(ticks),
                });
            });
        });
    });

    it('saves recorded timings', () => {
        cy.writeFile(
            `data/tick-patients/${new Date().toISOString()}.json`,
            timings
        );
    });
});
