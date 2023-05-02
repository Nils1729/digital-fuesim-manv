import { defineConfig } from 'cypress';

export default defineConfig({
    retries: {
        runMode: 1,
        openMode: 1,
    },
    e2e: {
        viewportWidth: 1920,
        viewportHeight: 1080,
        experimentalStudio: true,
        baseUrl: 'http://127.0.0.1:4200',
        video: false,
    },
});
