import { IsValue } from '../../../utils/validators/is-value';
import { cloneDeepMutable } from '../../../utils/clone-deep';
import { getCreate } from '../../../models/utils/get-create';
import { RadiogramUnpublishedStatus } from '../../../models/radiogram/status/radiogram-unpublished-status';
import { publishRadiogram } from '../../../models/radiogram/radiogram-helpers-mutable';
import { nextUUIDSimulatedRegion } from '../../../simulation/utils/randomness';
import { ResourceRequestRadiogram } from '../../radiogram/resource-request-radiogram';
import type { Mutable } from '../../../utils/immutability';
import { isDone, isUnread } from '../../radiogram/radiogram-helpers';
import { StrictObject } from '../../../utils/strict-object';
import { isEmptyResource } from '../rescue-resource';
import {
    collectRadiogram,
    ifCollectUpdates,
} from '../../../state-helpers/standin-helpers/tick-updates';
import type {
    RequestTarget,
    RequestTargetConfiguration,
} from './request-target';

export class TraineesRequestTargetConfiguration
    implements RequestTargetConfiguration
{
    @IsValue('traineesRequestTarget')
    public readonly type = 'traineesRequestTarget';

    static readonly create = getCreate(this);
}

export const traineesRequestTarget: RequestTarget<TraineesRequestTargetConfiguration> =
    {
        configuration: TraineesRequestTargetConfiguration,
        createRequest: (
            draftState,
            requestingSimulatedRegion,
            _configuration,
            requestedResource,
            key
        ) => {
            const unreadRadiogram = StrictObject.values(
                draftState.radiograms
            ).find(
                (radiogram) =>
                    radiogram.type === 'resourceRequestRadiogram' &&
                    isUnread(radiogram) &&
                    radiogram.key === key
            ) as Mutable<ResourceRequestRadiogram> | undefined;
            if (unreadRadiogram) {
                if (isEmptyResource(requestedResource)) {
                    delete draftState.radiograms[unreadRadiogram.id];
                    ifCollectUpdates(draftState, () => {
                        collectRadiogram(draftState, unreadRadiogram, 'del');
                    });
                } else {
                    unreadRadiogram.requiredResource = requestedResource;
                    ifCollectUpdates(draftState, () => {
                        collectRadiogram(draftState, unreadRadiogram, 'mod');
                    });
                }
                return;
            }

            if (
                StrictObject.values(draftState.radiograms)
                    .filter(
                        (radiogram) =>
                            radiogram.type === 'resourceRequestRadiogram' &&
                            radiogram.key === key
                    )
                    .every(isDone) &&
                !isEmptyResource(requestedResource)
            ) {
                publishRadiogram(
                    draftState,
                    cloneDeepMutable(
                        ResourceRequestRadiogram.create(
                            nextUUIDSimulatedRegion(requestingSimulatedRegion),
                            requestingSimulatedRegion.id,
                            RadiogramUnpublishedStatus.create(),
                            requestedResource,
                            key
                        )
                    )
                );
                // eslint-disable-next-line no-useless-return
                return;
            }

            /**
             * There is a radiogram that is currently accepted,
             * we therefore wait for an answer and don't send another request
             */
        },
    };
