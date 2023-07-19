ARG PRODUCTION_PATH="/usr/local/app"

FROM node:18-bullseye-slim
ARG PRODUCTION_PATH

RUN apt-get update && \
    apt-get install --no-install-recommends \
        git git-lfs -y && \
    rm -rf /var/lib/apt/lists/*

COPY ./ $PRODUCTION_PATH
WORKDIR $PRODUCTION_PATH
RUN git clone https://github.com/nils1729/digital-fuesim-manv.git

CMD [ "/bin/bash", "-c", "benchmark.sh" ]
