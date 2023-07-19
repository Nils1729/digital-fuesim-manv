ARG PRODUCTION_PATH="/usr/local/app"

FROM node:18-bullseye-slim
ARG PRODUCTION_PATH

RUN apt-get update && \
    apt-get upgrade && \
    apt-get install --no-install-recommends \
        git git-lfs -y && \
    rm -rf /var/lib/apt/lists/*

COPY ./ $PRODUCTION_PATH

WORKDIR $PRODUCTION_PATH
RUN git checkout thesis/control
RUN git checkout thesis/separated-regions
RUN npm run setup
WORKDIR $PRODUCTION_PATH/nh-thesis-benchmarks
RUN npm i

WORKDIR $PRODUCTION_PATH

CMD [ "/bin/bash", "-c", "docker/benchmark.sh" ]
