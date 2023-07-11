import type {
    Material,
    Mutable,
    Patient,
    Personnel,
    Vehicle,
    SimulatedRegion,
    ExerciseConfiguration,
    UUID,
    ManagePatientTransportToHospitalBehaviorState,
} from 'digital-fuesim-manv-shared';
import {
    MapPosition,
    PatientTemplate,
    cloneDeepMutable,
    createVehicleParameters,
    defaultPatientCategories,
    ExerciseState,
    SimulatedRegionPosition,
    TransferPoint,
    uuid,
    unloadVehicle,
    elementTypePluralMap,
    applyAction,
    VehicleTemplate,
    isInSpecificSimulatedRegion,
} from 'digital-fuesim-manv-shared';
import {
    reconstituteSimulatedRegionTemplate,
    stereotypes,
} from '../../frontend/src/app/pages/exercises/exercise/shared/editor-panel/templates/simulated-region';
import {
    AddElementToSimulatedRegionAction,
    SimulatedRegionActionReducers,
} from 'digital-fuesim-manv-shared/dist/store/action-reducers/simulated-region';
import { random, trim } from 'cypress/types/lodash';

export class ScenarioBuilder {
    draftState: Mutable<ExerciseState>;
    constructor(participantId = '123456') {
        this.draftState = cloneDeepMutable(ExerciseState.create(participantId));
    }

    setStandInConfig(config: ExerciseConfiguration['standInConfig']) {
        this.draftState.configuration.standInConfig = cloneDeepMutable(config);
    }

    addRegionWithVehicles(
        region: Mutable<SimulatedRegion>,
        vehicleTypes: String[]
    ) {
        const transferPoint = TransferPoint.create(
            SimulatedRegionPosition.create(region.id),
            {},
            {},
            '',
            `[Simuliert] ${region.name}`
        );
        applyAction(this.draftState, {
            type: '[SimulatedRegion] Add simulated region',
            simulatedRegion: region,
            transferPoint,
        });
        vehicleTypes.forEach((vt) => {
            const template = this.draftState.vehicleTemplates.find(
                (t) => t.vehicleType === vt
            )!;

            const params = createVehicleParameters(
                uuid(),
                template,
                this.draftState.materialTemplates,
                this.draftState.personnelTemplates,
                { x: 0, y: 0 }
            );

            applyAction(this.draftState, {
                type: '[Vehicle] Add vehicle',
                ...params,
            });
            applyAction(this.draftState, {
                type: '[SimulatedRegion] Add Element',
                elementToBeAddedId: params.vehicle.id,
                elementToBeAddedType: 'vehicle',
                simulatedRegionId: region.id,
            });
        });
        return this;
    }

    addFullPatientTray(coords: { x: number; y: number }, name: string) {
        const region = reconstituteSimulatedRegionTemplate(
            stereotypes[0]!,
            this.draftState
        );
        region.position = MapPosition.create(coords);
        region.name = name;
        const vehicles = ['RTW'];
        this.addRegionWithVehicles(region, vehicles);

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
        patients.forEach((patient) => {
            applyAction(this.draftState, {
                type: '[Patient] Add patient',
                patient,
            });
            applyAction(this.draftState, {
                type: '[SimulatedRegion] Add Element',
                elementToBeAddedId: patient.id,
                elementToBeAddedType: 'patient',
                simulatedRegionId: region.id,
            });
        });

        return region.id;
    }

    addFullStagingArea(coords: { x: number; y: number }, name: string) {
        const region = reconstituteSimulatedRegionTemplate(
            stereotypes[1]!,
            this.draftState
        );
        region.position = MapPosition.create(coords);
        region.name = name;
        // TODO: more vehicles
        const vehicles = ['RTW', 'RTW', 'KTW'];
        this.addRegionWithVehicles(region, vehicles);

        // Add leader vehicle
        this.addUnloadedVehicleToRegion('KTW', region.id);

        return region.id;
    }

    addTORegion(
        coords: { x: number; y: number },
        name: string,
        stagingId: UUID,
        managedIds: UUID[]
    ) {
        const region = reconstituteSimulatedRegionTemplate(
            stereotypes[2]!,
            this.draftState
        );
        region.position = MapPosition.create(coords);
        region.name = name;
        this.addRegionWithVehicles(region, []);

        // Add leader vehicle
        this.addUnloadedVehicleToRegion('KTW', region.id);

        const managementBehavior = Object.values(region.behaviors).find(
            (b): b is Mutable<ManagePatientTransportToHospitalBehaviorState> =>
                b.type === 'managePatientTransportToHospitalBehavior'
        )!;

        applyAction(this.draftState, {
            type: '[ManagePatientsTransportToHospitalBehavior] Start Transport',
            behaviorId: managementBehavior.id,
            simulatedRegionId: region.id,
        });
        applyAction(this.draftState, {
            type: '[ManagePatientsTransportToHospitalBehavior] Change Transport Request Target',
            behaviorId: managementBehavior.id,
            simulatedRegionId: region.id,
            requestTargetId: stagingId,
        });
        managedIds.forEach((mid) =>
            applyAction(this.draftState, {
                type: '[ManagePatientsTransportToHospitalBehavior] Add Simulated Region To Manage For Transport',
                behaviorId: managementBehavior.id,
                simulatedRegionId: region.id,
                managedSimulatedRegionId: mid,
            })
        );

        return region.id;
    }

    connectRegions(ida: UUID, idb: UUID) {
        const transferPointId1 = Object.entries(
            this.draftState.transferPoints
        ).find(([k, v]) => isInSpecificSimulatedRegion(v, ida))![0];
        const transferPointId2 = Object.entries(
            this.draftState.transferPoints
        ).find(([k, v]) => isInSpecificSimulatedRegion(v, idb))![0];

        applyAction(this.draftState, {
            type: '[TransferPoint] Connect TransferPoints',
            transferPointId1,
            transferPointId2,
        });
    }

    addUnloadedVehicleToRegion(type: string, regionId: UUID) {
        const template = this.draftState.vehicleTemplates.find(
            (t) => t.vehicleType === type
        )!;
        const params = createVehicleParameters(
            uuid(),
            template,
            this.draftState.materialTemplates,
            this.draftState.personnelTemplates,
            { x: 0, y: 0 }
        );
        applyAction(this.draftState, {
            type: '[Vehicle] Add vehicle',
            ...params,
        });
        applyAction(this.draftState, {
            type: '[SimulatedRegion] Add Element',
            elementToBeAddedId: params.vehicle.id,
            elementToBeAddedType: 'vehicle',
            simulatedRegionId: regionId,
        });
        applyAction(this.draftState, {
            type: '[Vehicle] Unload vehicle',
            vehicleId: params.vehicle.id,
        });
    }

    addCluster(x: number, prefix: string) {
        let y = 0;
        let paIds = [];
        const stagingId = this.addFullStagingArea(
            { x, y },
            `${prefix} - Staging`
        );
        y += stereotypes[0]!.size.height * 1.1;
        for (let i = 0; i < 4; i++) {
            paIds.push(
                this.addFullPatientTray({ x, y }, `${prefix} - PA ${i}`)
            );
            this.connectRegions(stagingId, paIds[paIds.length - 1]!);
            y += stereotypes[0]!.size.height * 1.1;
        }
    }

    ageTicks(n: number, tickInterval: number = 1000) {
        for (let i = 0; i < n; i++) {
            applyAction(this.draftState, { type: '[Exercise] Start' });
            applyAction(this.draftState, {
                type: '[Exercise] Tick',
                tickInterval,
                refreshTreatments: true,
            });
            applyAction(this.draftState, { type: '[Exercise] Pause' });
        }
    }

    build() {
        return cloneDeepMutable(this.draftState);
    }
}
