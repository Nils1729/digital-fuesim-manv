import type { SimulatedRegion, SimulatedRegionStandIn } from '../../models';

export function isStandIn(
    simulatedRegion: SimulatedRegion | SimulatedRegionStandIn
): simulatedRegion is SimulatedRegionStandIn {
    return simulatedRegion.type === 'simulatedRegionStandIn';
}
