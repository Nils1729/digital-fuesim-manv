import type {
    SimulatedRegion,
    SimulatedRegionStandIn,
} from '../models/simulated-region';
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
        if (sr.type === 'simulatedRegionStandIn') {
            throw new this(sr.id);
        }
    }
}
