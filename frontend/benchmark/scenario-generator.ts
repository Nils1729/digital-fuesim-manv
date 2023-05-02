import type {
    Material,
    Mutable,
    Patient,
    Personnel,
    Vehicle,
} from 'digital-fuesim-manv-shared';
import {
    MapPosition,
    PatientTemplate,
    SimulatedRegion,
    cloneDeepMutable,
    createVehicleParameters,
    defaultPatientCategories,
    ExerciseState,
    SimulatedRegionPosition,
    TransferPoint,
    uuid,
    unloadVehicle,
    elementTypePluralMap,
} from 'digital-fuesim-manv-shared';
import {
    reconstituteSimulatedRegionTemplate,
    stereotypes,
} from '../src/app/pages/exercises/exercise/shared/editor-panel/templates/simulated-region';

export class ScenarioBuilder {
    draftState: Mutable<ExerciseState>;
    constructor(participantId = '123456') {
        this.draftState = cloneDeepMutable(ExerciseState.create(participantId));
    }

    addRegion(
        region: Mutable<SimulatedRegion>,
        elements: Mutable<Material | Patient | Personnel | Vehicle>[]
    ) {
        const transferPoint = cloneDeepMutable(
            TransferPoint.create(
                SimulatedRegionPosition.create(region.id),
                {},
                {},
                '',
                `[Simuliert] ${region.name}`
            )
        );
        this.draftState.simulatedRegions[region.id] = region;
        [...elements, transferPoint].forEach((element) => {
            element.position = SimulatedRegionPosition.create(region.id);
            this.draftState[elementTypePluralMap[element.type]][element.id] =
                element;
        });
        return this;
    }

    addFullPatientTray(index: number, cols = 16) {
        const region = reconstituteSimulatedRegionTemplate(
            stereotypes[1]!,
            this.draftState
        );
        region.position = MapPosition.create({
            x: region.size.width * 1.1 * (index % cols),
            y: region.size.height * 1.1 * Math.floor(index / cols),
        });
        region.name = `PA ${index + 1}`;
        const position = SimulatedRegionPosition.create(region.id);
        const patients = defaultPatientCategories.flatMap((category) =>
            category.patientTemplates.map((template) =>
                cloneDeepMutable(
                    PatientTemplate.generatePatient(
                        template,
                        category.name,
                        cloneDeepMutable(position)
                    )
                )
            )
        );
        const vehicles = 'RTW,RTW,KTW'
            .split(',')
            .flatMap((name) =>
                this.createVehicle(this.draftState, name).flat()
            );

        this.addRegion(region, [...patients, ...vehicles]);
        vehicles
            .filter((v): v is Vehicle => v.type === 'vehicle')
            .forEach((v) => unloadVehicle(this.draftState, region, v));
        return this;
    }

    private createVehicle(
        draftState: Mutable<ExerciseState>,
        vehicleType: string
    ): [Mutable<Vehicle>[], Mutable<Personnel>[], Mutable<Material>[]] {
        const template = draftState.vehicleTemplates.find(
            (t) => t.vehicleType === vehicleType
        )!;

        const params = cloneDeepMutable(
            createVehicleParameters(
                uuid(),
                template,
                draftState.materialTemplates,
                draftState.personnelTemplates,
                { x: 0, y: 0 }
            )
        );

        return [[params.vehicle], params.personnel, params.materials];
    }

    build() {
        return cloneDeepMutable(this.draftState);
    }
}
