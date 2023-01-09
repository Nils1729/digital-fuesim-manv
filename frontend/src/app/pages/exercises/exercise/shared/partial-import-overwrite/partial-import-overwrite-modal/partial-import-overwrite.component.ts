import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { plainToInstance } from 'class-transformer';
import {
    PartialExport,
    preparePartialExportForImport,
} from 'digital-fuesim-manv-shared';
import { ExerciseService } from 'src/app/core/exercise.service';
import { MessageService } from 'src/app/core/messages/message.service';

@Component({
    selector: 'app-partial-import-overwrite',
    templateUrl: './partial-import-overwrite.component.html',
    styleUrls: ['./partial-import-overwrite.component.scss'],
})
export class PartialImportOverwriteComponent {
    public importingPartialExport = false;
    constructor(
        public activeModal: NgbActiveModal,
        private readonly messageService: MessageService,
        private readonly exerciseService: ExerciseService
    ) {}

    public partialExport!: PartialExport;

    public close() {
        this.activeModal.close();
    }

    public async partialImportOverwrite(mode: 'append' | 'overwrite') {
        this.importingPartialExport = true;
        try {
            const importInstance = plainToInstance(
                PartialExport,
                this.partialExport
            );
            const result = await this.exerciseService.proposeAction({
                type: '[Exercise] Import Templates',
                mode,
                partialExport: preparePartialExportForImport(importInstance),
            });
            if (!result.success) {
                throw new Error((result as { message?: string }).message);
            }
            this.messageService.postMessage({
                title: 'Vorlagen erfolgreich importiert',
                color: 'success',
            });
            this.close();
        } catch (error: unknown) {
            this.messageService.postError({
                title: 'Fehler beim Importieren von Vorlagen',
                error,
            });
        } finally {
            this.importingPartialExport = false;
        }
    }
}
