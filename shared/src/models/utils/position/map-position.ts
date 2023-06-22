import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { IsValue } from '../../../utils/validators';
import { getCreate } from '../get-create';
import { MapCoordinates } from './map-coordinates';

export class MapPosition {
    /**
     * @deprecated Use {@link isOnMap } or {@link isNotOnMap} instead
     */
    @IsValue('coordinates')
    public readonly type = 'coordinates';

    /**
     * @deprecated Use {@link currentCoordinatesOf} instead
     */
    @Type(() => MapCoordinates)
    @ValidateNested()
    public readonly coordinates: MapCoordinates;

    /**
     * @deprecated Use {@link create} instead
     */
    constructor(position: MapCoordinates) {
        this.coordinates = position;
    }

    static readonly create = getCreate(this);
}
