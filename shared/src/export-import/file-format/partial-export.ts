import { Type } from 'class-transformer';
import {
    IsArray,
    IsIn,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { MapImageTemplate, VehicleTemplate } from '../../models';
import { PatientCategory } from '../../models/patient-category';
import { BaseExportImportFile } from './base-file';

export class PartialExport extends BaseExportImportFile {
    @IsIn(['partial'])
    @IsString()
    public readonly type: 'partial' = 'partial';

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PatientCategory)
    public readonly patientCategories?: PatientCategory[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => VehicleTemplate)
    public readonly vehicleTemplates?: VehicleTemplate[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MapImageTemplate)
    public readonly mapImageTemplates?: MapImageTemplate[];

    public constructor(
        patientCategories?: PatientCategory[],
        vehicleTemplates?: VehicleTemplate[],
        mapImageTemplates?: MapImageTemplate[]
    ) {
        super();
        this.patientCategories = patientCategories;
        this.vehicleTemplates = vehicleTemplates;
        this.mapImageTemplates = mapImageTemplates;
    }
}
