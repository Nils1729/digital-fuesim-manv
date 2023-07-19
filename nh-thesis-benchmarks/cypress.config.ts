import { defineConfig } from 'cypress';

export default defineConfig({
    retries: {
        runMode: null,
        openMode: null,
    },
    e2e: {
        supportFile: 'cypress/support/commands.ts',
        specPattern: 'cypress/*.cy.ts',
        viewportWidth: 1920,
        viewportHeight: 1080,
        experimentalStudio: true,
        // baseUrl: 'http://127.0.0.1:4200',
        video: false,
        screenshotOnRunFailure: false,
    },
});
