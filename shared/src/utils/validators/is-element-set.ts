import type { ValidationArguments, ValidationOptions } from 'class-validator';
import { isString } from 'class-validator';
import type { UUIDSet } from '../uuid-set';
import type { ElementTypePluralMap } from '../element-type-plural-map';
import type { StandInElement } from '../../models/simulated-region-standin';
import { createMapValidator } from './create-map-validator';
import type { GenericPropertyDecorator } from './generic-property-decorator';
import { makeValidator } from './make-validator';
import type { AllowedValues } from './is-literal-union';
import { isLiteralUnion } from './is-literal-union';
import { isUUIDSet } from './is-uuid-set';

export function isElementSet<Key extends string>(
    keyAllowedValues?: AllowedValues<Key>,
    valueToBeValidated?: unknown
): valueToBeValidated is { [key in Key]?: UUIDSet } {
    return createMapValidator<Key, UUIDSet>({
        keyValidator: (keyAllowedValues
            ? (value: unknown) => isLiteralUnion(keyAllowedValues, value)
            : isString) as (value: unknown) => value is Key,
        valueValidator: isUUIDSet,
    })(valueToBeValidated);
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function IsElementSet<Key extends string, Each extends boolean = false>(
    keyAllowedValues?: AllowedValues<Key>,
    validationOptions?: ValidationOptions & { each?: Each }
): GenericPropertyDecorator<{ [key in Key]?: UUIDSet }, Each> {
    return makeValidator<{ [key in Key]?: UUIDSet }, Each>(
        'isElementSet',
        (value: unknown, args?: ValidationArguments) =>
            isElementSet(keyAllowedValues, value),
        validationOptions
    );
}

export const elementSetAllowedValues: AllowedValues<
    ElementTypePluralMap[StandInElement['type']]
> = {
    patients: true,
    vehicles: true,
    personnel: true,
    materials: true,
};
