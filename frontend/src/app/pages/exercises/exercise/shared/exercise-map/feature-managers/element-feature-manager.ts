import type { UUID, Position } from 'digital-fuesim-manv-shared';
import type { MapBrowserEvent } from 'ol';
import { Feature } from 'ol';
import Point from 'ol/geom/Point';
import type VectorLayer from 'ol/layer/Vector';
import type VectorSource from 'ol/source/Vector';
import type OlMap from 'ol/Map';
import type { AppState } from 'src/app/state/app.state';
import type { Store } from '@ngrx/store';
import { getStateSnapshot } from 'src/app/state/get-state-snapshot';
import type { TranslateEvent } from 'ol/interaction/Translate';
import type { LineString } from 'ol/geom';
import { MovementAnimator } from '../utility/movement-animator';
import { TranslateHelper } from '../utility/translate-helper';
import type { FeatureManager } from '../utility/feature-manager';
import { ElementManager } from './element-manager';

export interface PositionableElement {
    readonly id: UUID;
    readonly position: Position;
}

/**
 * The base class for all element feature managers.
 * * manages the position of the element
 * * manages the default interactions of the element
 */
export abstract class ElementFeatureManager<
        Element extends PositionableElement,
        FeatureType extends LineString | Point = Point,
        ElementFeature extends Feature<FeatureType> = Feature<FeatureType>
    >
    extends ElementManager<
        Element,
        FeatureType,
        ElementFeature,
        ReadonlySet<keyof Element>
    >
    implements FeatureManager<ElementFeature>
{
    private readonly type: FeatureType extends LineString
        ? 'LineString'
        : 'Point';

    private readonly movementAnimator;
    protected readonly translateHelper = new TranslateHelper<FeatureType>();
    private readonly elementCreator: (element: Element) => ElementFeature;

    constructor(
        protected readonly store: Store<AppState>,
        protected readonly olMap: OlMap,
        public readonly layer: VectorLayer<VectorSource<FeatureType>>,
        private readonly proposeMovementAction: (
            newPosition: FeatureType extends Point ? Position : Position[],
            element: Element
        ) => void,
        type: FeatureType extends LineString ? 'LineString' : 'Point',
        elementCreator: FeatureType extends LineString
            ? (element: Element) => ElementFeature
            : ((element: Element) => ElementFeature) | undefined
    ) {
        super();
        this.type = type;
        this.movementAnimator = new MovementAnimator(
            this.olMap,
            this.layer,
            this.type
        );
        if (!elementCreator) {
            if (this.type !== 'Point') {
                throw new TypeError(`Expected Point, but got ${this.type}`);
            } else {
                this.elementCreator = ((element) =>
                    new Feature(
                        new Point([element.position.x, element.position.y])
                    )) as (
                    element: Element
                ) => ElementFeature /* ElementFeature is Feature<Point> here, TS doesn't know that */;
            }
        } else {
            this.elementCreator = elementCreator;
        }
    }

    override unsupportedChangeProperties: ReadonlySet<keyof Element> = new Set(
        [] as const
    );
    createFeature(element: Element): ElementFeature {
        const elementFeature = this.elementCreator(element);
        elementFeature.setId(element.id);
        this.layer.getSource()!.addFeature(elementFeature);
        this.translateHelper.onTranslateEnd(elementFeature, (newPosition) => {
            this.proposeMovementAction(newPosition, element);
        });
        return elementFeature;
    }

    deleteFeature(element: Element, elementFeature: ElementFeature): void {
        this.layer.getSource()!.removeFeature(elementFeature);
        this.movementAnimator.stopMovementAnimation(elementFeature);
    }

    changeFeature(
        oldElement: Element,
        newElement: Element,
        // It is too much work to correctly type this param with {@link unsupportedChangeProperties}
        changedProperties: ReadonlySet<keyof Element>,
        patientFeature: ElementFeature
    ): void {
        if (changedProperties.has('position')) {
            this.movementAnimator.animateFeatureMovement(patientFeature, [
                newElement.position.x,
                newElement.position.y,
            ]);
        }
    }

    getFeatureFromElement(element: Element): ElementFeature | undefined {
        return (
            (this.layer
                .getSource()!
                .getFeatureById(element.id) as ElementFeature | null) ??
            undefined
        );
    }

    protected getElementFromFeature(feature: Feature<any>) {
        const id = feature.getId() as UUID;
        const exerciseState = getStateSnapshot(this.store).exercise;
        // We expect the id to be globally unique
        if (exerciseState.materials[id]) {
            return {
                type: 'material',
                value: exerciseState.materials[id] as unknown as Element,
            } as const;
        }
        if (exerciseState.patients[id]) {
            return {
                type: 'patient',
                value: exerciseState.patients[id] as unknown as Element,
            } as const;
        }
        if (exerciseState.vehicles[id]) {
            return {
                type: 'vehicle',
                value: exerciseState.vehicles[id] as unknown as Element,
            } as const;
        }
        if (exerciseState.personnel[id]) {
            return {
                type: 'personnel',
                value: exerciseState.personnel[id] as unknown as Element,
            } as const;
        }
        if (exerciseState.mapImages[id]) {
            return {
                type: 'image',
                value: exerciseState.mapImages[id] as unknown as Element,
            } as const;
        }
        if (exerciseState.viewports[id]) {
            return {
                type: 'viewport',
                value: exerciseState.viewports[id] as unknown as Element,
            } as const;
        }
        if (exerciseState.transferPoints[id]) {
            return {
                type: 'transferPoint',
                value: exerciseState.transferPoints[id] as unknown as Element,
            } as const;
        }
        return undefined;
    }

    public onFeatureClicked(
        event: MapBrowserEvent<any>,
        feature: ElementFeature
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    ): void {}

    /**
     * The standard implementation is to ignore these events.
     */
    public onFeatureDrop(
        dropEvent: TranslateEvent,
        droppedFeature: Feature<any>,
        droppedOnFeature: ElementFeature
    ): boolean {
        return false;
    }
}
