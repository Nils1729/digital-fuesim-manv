import type { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PartialExportComponent } from './partial-export-modal/partial-export-modal.component';

export function openPartialExportSelectionModal(ngbModalService: NgbModal) {
    ngbModalService.open(PartialExportComponent, {
        size: 'm',
    });
}
