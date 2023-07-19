cd digital-fuesim-manv/
git checkout thesis/control
git checkout thesis/separated-regions
npm run setup
cd nh-thesis-benchmarks/
npm i
mkdir -p scenarios/main scenarios/thesis data/scenarios/main data/scenarios/thesis
npx node --experimental-specifier-resolution=node --loader ts-node/esm src/scenarios.ts
npm run cy:scenarios:firefox
