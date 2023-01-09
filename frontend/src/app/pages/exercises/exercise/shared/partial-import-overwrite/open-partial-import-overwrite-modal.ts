import type { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import type { PartialExport } from 'digital-fuesim-manv-shared';
import { PartialImportOverwriteComponent } from './partial-import-overwrite-modal/partial-import-overwrite.component';

/**
 *
 * @param partialExport The migrated {@link PartialExport} to import.
 */
export function openPartialImportOverwriteModal(
    ngbModalService: NgbModal,
    partialExport: PartialExport
) {
    const modelRef = ngbModalService.open(PartialImportOverwriteComponent, {
        size: 'm',
    });
    const componentInstance =
        modelRef.componentInstance as PartialImportOverwriteComponent;
    componentInstance.partialExport = partialExport;
}
