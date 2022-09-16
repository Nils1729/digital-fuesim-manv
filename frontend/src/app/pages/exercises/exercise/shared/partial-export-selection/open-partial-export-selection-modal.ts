import type { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PartialExportSelectionComponent } from './partial-export-selection-modal/partial-export-selection.component';

export function openPartialExportSelectionModal(ngbModalService: NgbModal) {
    ngbModalService.open(PartialExportSelectionComponent, {
        size: 'm',
    });
}
