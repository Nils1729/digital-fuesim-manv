import { IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsPosition } from '../utils/validators/is-position';
import { UUID, uuid, uuidValidationOptions } from '../utils/uuid';
import { IsValue } from '../utils/validators/is-value';
import type { ElementTypePluralMap, UUIDSet } from '../utils';
import {
    IsElementSet,
    elementSetAllowedValues,
} from '../utils/validators/is-element-set';
import { getCreate } from './utils/get-create';
import type { ImageProperties } from './utils/image-properties';
import type { MapCoordinates } from './utils/position/map-coordinates';
import { MapPosition } from './utils/position/map-position';
import { Size } from './utils/size';
import { Position } from './utils/position/position';
import type { Personnel } from './personnel';
import type { Patient } from './patient';
import type { Material } from './material';
import type { Vehicle } from './vehicle';

export type StandInElement = Material | Patient | Personnel | Vehicle;
export const standInElementTypeAllowedValues = {
    material: true,
    personnel: true,
    patient: true,
    vehicle: true,
} as const;

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
     * Placeholder for elements that would be in this region.
     */
    @IsElementSet(elementSetAllowedValues)
    public readonly elements: {
        [key in ElementTypePluralMap[StandInElement['type']]]?: UUIDSet;
    };

    /**
     * @param position top-left position
     * @deprecated Use {@link create} instead
     */
    constructor(
        position: MapCoordinates,
        size: Size,
        name: string,
        borderColor: string = '#cccc00',
        elements: SimulatedRegionStandIn['elements'] = {}
    ) {
        this.position = MapPosition.create(position);
        this.size = size;
        this.name = name;
        this.borderColor = borderColor;

        this.elements = elements;
    }

    static readonly create = getCreate(this);

    static image: ImageProperties = {
        url: 'assets/simulated-region.svg',
        height: 1800,
        aspectRatio: 1600 / 900,
    };
}
