import {
    ExerciseConfiguration,
    StateExport,
    StrictObject,
} from 'digital-fuesim-manv-shared';
import { ScenarioBuilder } from './scenario-generator';
import { writeFileSync, mkdirSync } from 'node:fs';

const pa_counts = [0, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200];
const pa_fractions = [0, 0.2, 0.4, 0.6, 0.8, 1];
const pa_totals = [0, 5, 10, 15, 20, 25, 30];
const repetitions = 1;
const tick_count = 300;

function generate_thesis_scenarios(root: string, preComputePatients = false) {
    mkdirSync(root, {recursive: true})
    const settings: {
        filename?: string;
        pas: number;
        loaded_pas: number;
        fraction_pas: number;
        ticks: number;
        run: number;
        config: ExerciseConfiguration['standInConfig'];
    }[] = [];
    for (let i = 0; i < repetitions; i++) {
        pa_counts.forEach((pas) =>
            pa_fractions.forEach((paf) =>
                settings.push({
                    pas,
                    loaded_pas: Math.floor(pas * paf),
                    fraction_pas: paf,
                    ticks: tick_count,
                    run: i,
                    config: {
                        useStandIns: true,
                        holdInterval: 1_000_000_000,
                        updateInterval: 5,
                        preComputation: { patients: preComputePatients, standIns: true },
                    },
                })
            )
        );

        pa_counts.forEach((pas) =>
            pa_totals.forEach((pat) => {
                if (pat > pas) return;
                settings.push({
                    pas,
                    loaded_pas: pat,
                    fraction_pas: -1,
                    ticks: tick_count,
                    run: i,
                    config: {
                        useStandIns: true,
                        holdInterval: 1_000_000_000,
                        updateInterval: 5,
                        preComputation: { patients: false, standIns: true },
                    },
                });
            })
        );
    }

    settings.forEach(
        ({ pas, loaded_pas, fraction_pas, ticks, run, config }, i) => {
            const g = new ScenarioBuilder();
            g.generate(pas, loaded_pas, config);
            const scenario = g.build();
            const filename = `${i
                .toString()
                .padStart(2, '0')}_${pas}x${fraction_pas}_${ticks}_${run}_${
                config.preComputation.patients ? 'P' : ''
            }${config.preComputation.standIns ? 'S' : ''}.json`;
            writeFileSync(
                `${root}/${filename}`,
                JSON.stringify(new StateExport(scenario))
            );
            settings[i]!.filename = filename;
        }
    );

    writeFileSync(`${root}/settings.json`, JSON.stringify(settings));

    const scenario_settings: {
        filename?: string;
        pas: number;
        ticks: number;
        run: number;
        config: ExerciseConfiguration['standInConfig'];
    }[] = [];
    for (let i = 0; i < repetitions; i++) {
        pa_counts.forEach((pas) =>
            scenario_settings.push({
                pas,
                ticks: tick_count,
                run: i,
                config: {
                    useStandIns: true,
                    holdInterval: 1_000_000_000,
                    updateInterval: 5,
                    preComputation: { patients: false, standIns: true },
                },
            })
        );
    }

    scenario_settings.forEach(({ pas, ticks, run, config }, i) => {
        const g = new ScenarioBuilder();
        g.generate(pas, pas, config);
        const scenario = g.build();
        const filename = `${i
            .toString()
            .padStart(2, '0')}_${pas}_${ticks}_${run}_${
            config.preComputation.patients ? 'P' : ''
        }${config.preComputation.standIns ? 'S' : ''}_scenario.json`;
        writeFileSync(
            `${root}/${filename}`,
            JSON.stringify(new StateExport(scenario))
        );
        settings[i]!.filename = filename;
    });

    writeFileSync(`${root}/settings_scenarios.json`, JSON.stringify(settings));
}

function generate_main_scenarios(root: string) {
    mkdirSync(root, {recursive: true})
    const settings: {
        filename?: string;
        pas: number;
        loaded_pas: number;
        fraction_pas: number;
        ticks: number;
        run: number;
        config: ExerciseConfiguration['standInConfig'];
    }[] = [];
    for (let i = 0; i < repetitions; i++) {
        pa_counts.forEach((pas) =>
            [1].forEach((paf) =>
                settings.push({
                    pas,
                    loaded_pas: Math.floor(pas * paf),
                    fraction_pas: paf,
                    ticks: tick_count,
                    run: i,
                    config: {
                        useStandIns: false,
                        preComputation: { patients: true, standIns: false },
                    },
                })
            )
        );
    }

    settings.forEach(({ pas, loaded_pas, ticks, run, config }, i) => {
        const g = new ScenarioBuilder();
        g.generate(pas, loaded_pas, config);
        const scenario = g.build();
        thesis_to_main(scenario);
        const filename = `${i
            .toString()
            .padStart(2, '0')}_${pas}_${ticks}_${run}_${
            config.preComputation.patients ? 'P' : ''
        }${config.preComputation.standIns ? 'S' : ''}.json`;
        writeFileSync(
            `${root}/${filename}`,
            JSON.stringify(new StateExport(scenario))
        );
        settings[i]!.filename = filename;
    });

    writeFileSync(`${root}/settings.json`, JSON.stringify(settings));
    writeFileSync(`${root}/settings_scenarios.json`, JSON.stringify(settings));
}

function thesis_to_main(scenario: any) {
    delete scenario.configuration.standInConfig;
    StrictObject.values(scenario.simulatedRegions).forEach((s) => {
        delete s.ownEvents;
        delete s.randomState;
    });
}

generate_thesis_scenarios('scenarios/thesis', true);
generate_thesis_scenarios('scenarios/thesis-client-patients', false);
generate_main_scenarios('scenarios/main');
generate_main_scenarios('scenarios/main-client-patients');

// npx node --experimental-specifier-resolution=node --loader ts-node/esm src/scenarios.ts
