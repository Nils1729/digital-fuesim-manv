import { Type } from 'class-transformer';
import { IsString, IsUUID, ValidateNested } from 'class-validator';
import { UUID, uuid, uuidValidationOptions } from '../utils';
import { IsPosition } from '../utils/validators/is-position';
import { IsMultiTypedIdMap, IsValue } from '../utils/validators';
import type { ExerciseSimulationEvent } from '../simulation/events/exercise-simulation-event';
import { simulationEventTypeOptions } from '../simulation/events/exercise-simulation-event';
import type { ExerciseSimulationActivityState } from '../simulation/activities/exercise-simulation-activity';
import { getSimulationActivityConstructor } from '../simulation/activities/exercise-simulation-activity';
import type { ExerciseSimulationBehaviorState } from '../simulation/behaviors/exercise-simulation-behavior';
import { simulationBehaviorTypeOptions } from '../simulation/behaviors/exercise-simulation-behavior';
import type { ImageProperties, MapCoordinates } from './utils';
import { MapPosition, Position, Size, getCreate } from './utils';

/**
 * Basic info about a region, used as a mock if the real region is missing on the client.
 */
export class SimulatedRegionStandIn {
    @IsUUID(4, uuidValidationOptions)
    public readonly id: UUID = uuid();

    @IsValue('simulatedRegionStandIn' as const)
    public readonly type = 'simulatedRegionStandIn';

    /**
     * top-left position
     *
     * @deprecated Do not access directly, use helper methods from models/utils/position/position-helpers(-mutable) instead.
     */
    @ValidateNested()
    @IsPosition()
    public readonly position: Position;

    @ValidateNested()
    @Type(() => Size)
    public readonly size: Size;

    @IsString()
    public readonly name: string;

    @IsString()
    public readonly borderColor: string;

    /**
     * @param position top-left position
     * @deprecated Use {@link create} instead
     */
    constructor(
        position: MapCoordinates,
        size: Size,
        name: string,
        borderColor: string = '#cccc00'
    ) {
        this.position = MapPosition.create(position);
        this.size = size;
        this.name = name;
        this.borderColor = borderColor;
    }

    static readonly create = getCreate(this);

    static image: ImageProperties = {
        url: 'assets/simulated-region.svg',
        height: 1800,
        aspectRatio: 1600 / 900,
    };
}

export class SimulatedRegion {
    @IsUUID(4, uuidValidationOptions)
    public readonly id: UUID = uuid();

    @IsValue('simulatedRegion' as const)
    public readonly type = 'simulatedRegion';

    /**
     * top-left position
     *
     * @deprecated Do not access directly, use helper methods from models/utils/position/position-helpers(-mutable) instead.
     */
    @ValidateNested()
    @IsPosition()
    public readonly position: Position;

    @ValidateNested()
    @Type(() => Size)
    public readonly size: Size;

    @IsString()
    public readonly name: string;

    @IsString()
    public readonly borderColor: string;

    @Type(...simulationEventTypeOptions)
    @ValidateNested()
    public readonly inEvents: readonly ExerciseSimulationEvent[] = [];

    @Type(...simulationBehaviorTypeOptions)
    @ValidateNested()
    public readonly behaviors: readonly ExerciseSimulationBehaviorState[] = [];

    @IsMultiTypedIdMap(getSimulationActivityConstructor)
    @ValidateNested()
    public readonly activities: {
        readonly [stateId: UUID]: ExerciseSimulationActivityState;
    } = {};

    /**
     * @param position top-left position
     * @deprecated Use {@link create} instead
     */
    constructor(
        position: MapCoordinates,
        size: Size,
        name: string,
        borderColor: string = '#cccc00'
    ) {
        this.position = MapPosition.create(position);
        this.size = size;
        this.name = name;
        this.borderColor = borderColor;
    }

    static readonly create = getCreate(this);

    static image: ImageProperties = {
        url: 'assets/simulated-region.svg',
        height: 1800,
        aspectRatio: 1600 / 900,
    };
}
