#!/bin/bash
npx node --experimental-specifier-resolution=node --loader ts-node/esm src/scenarios.ts
npm run cy:scenarios:firefox
