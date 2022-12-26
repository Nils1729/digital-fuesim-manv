import type { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PartialImportOverwriteComponent } from './partial-import-overwrite-modal/partial-import-overwrite.component';

export function openPartialImportOverwriteModal(
    ngbModalService: NgbModal,
    importString?: string
) {
    const modelRef = ngbModalService.open(PartialImportOverwriteComponent, {
        size: 'm',
    });
    const componentInstance =
        modelRef.componentInstance as PartialImportOverwriteComponent;
    componentInstance.importString = importString;
}
