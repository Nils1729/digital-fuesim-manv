import type { SimulatedRegion } from '../models/simulated-region';
import type {
    SimulatedRegionStandIn,
    StandInElement,
} from '../models/simulated-region-standin';
import { isStandIn } from '../state-helpers/standin-helpers/is-standin';
import type { UUID } from '../utils/uuid';

/**
 * This error gets thrown if an error in a reducer function occurs because the action isn't compatible to the state.
 */
export class ReducerError extends Error {
    public override readonly name = 'ReducerError';
}

export class ExpectedReducerError extends ReducerError {}

export class SimulatedRegionMissingError extends ReducerError {
    constructor(readonly simulatedRegionId: UUID) {
        super();
    }

    static throwIfMissing(
        sr: SimulatedRegion | SimulatedRegionStandIn
    ): asserts sr is SimulatedRegion {
        if (isStandIn(sr)) {
            throw new this(sr.id);
        }
    }
}

export class ElementOmittedError extends ReducerError {
    constructor(
        readonly elementType: StandInElement['type'],
        readonly elementId: UUID
    ) {
        super();
    }
}
