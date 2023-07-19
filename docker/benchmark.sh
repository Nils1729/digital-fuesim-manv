#!/bin/bash
mkdir -p scenarios/main scenarios/thesis data/scenarios/main data/scenarios/thesis
npx node --experimental-specifier-resolution=node --loader ts-node/esm src/scenarios.ts
npm run cy:scenarios:firefox
