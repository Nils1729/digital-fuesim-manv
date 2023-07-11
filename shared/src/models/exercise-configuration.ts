import { Type } from 'class-transformer';
import { Allow, IsBoolean, ValidateNested } from 'class-validator';
import { IsValue } from '../utils/validators';
import { defaultTileMapProperties } from '../data/default-state/tile-map-properties';
import { getCreate, TileMapProperties } from './utils';

export class ExerciseConfiguration {
    @IsValue('exerciseConfiguration' as const)
    public readonly type = 'exerciseConfiguration';

    @IsBoolean()
    public readonly pretriageEnabled: boolean = true;
    @IsBoolean()
    public readonly bluePatientsEnabled: boolean = false;

    @ValidateNested()
    @Type(() => TileMapProperties)
    public readonly tileMapProperties: TileMapProperties =
        defaultTileMapProperties;

    @Allow()
    public readonly standInConfig:
        | {
              useStandIns: false;
              preComputation: {
                  patients: boolean;
                  standIns: boolean;
              };
          }
        | {
              useStandIns: true;
              preComputation: {
                  patients: boolean;
                  standIns: true;
              };
              updateInterval: number;
              holdInterval: number;
          } = {
        preComputation: {
            patients: false,
            standIns: true,
        },
        holdInterval: 20_000,
        updateInterval: 10_000,
        useStandIns: true,
    };

    /**
     * @deprecated Use {@link create} instead
     */
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-empty-function
    constructor() {}

    static readonly create = getCreate(this);
}
