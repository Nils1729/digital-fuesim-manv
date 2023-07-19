ARG PRODUCTION_PATH="/usr/local/app"

ARG FIREFOX_VERSION="115.0.2"

FROM cypress/factory

ARG PRODUCTION_PATH

COPY ./ $PRODUCTION_PATH

WORKDIR $PRODUCTION_PATH
RUN npm run setup
WORKDIR $PRODUCTION_PATH/nh-thesis-benchmarks
RUN npm i

CMD [ "/bin/bash", "-c", "../docker/benchmark.sh" ]
