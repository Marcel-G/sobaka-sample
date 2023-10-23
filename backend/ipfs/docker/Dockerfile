FROM golang:1.21 AS builder

WORKDIR /

# Install jq for JSON manipulation in the config file
RUN apt update && apt install -y jq

# Kubo build process
# See details: https://github.com/ipfs/go-ds-s3
ENV GO111MODULE on

# We clone Kubo source code.
RUN git clone --depth 1 --branch v0.23.0 https://github.com/ipfs/kubo

# Move to kubo folder
WORKDIR /kubo

# Install the plugin and build ipfs
RUN go get github.com/ipfs/go-ds-s3/plugin@v0.9.0
RUN echo "\ns3ds github.com/ipfs/go-ds-s3/plugin 0" >> plugin/loader/preload_list
RUN make build
RUN go mod tidy
RUN make build
RUN make install

# The actual IPFS image we will use
FROM ipfs/kubo:v0.23.0

# We copy the new binaries we built in the 'builder' stage (--from=builder)
COPY --from=builder /kubo/cmd/ipfs/ipfs /usr/local/bin/ipfs
COPY --from=builder /kubo/bin/container_daemon /usr/local/bin/start_ipfs
COPY --from=builder /kubo/bin/container_init_run /usr/local/bin/container_init_run

# Fix permissions on start_ipfs
RUN chmod 0755 /usr/local/bin/start_ipfs

# We copy jq so we can manipulate the JSON config file easily in the init.d scripts
COPY --from=builder /usr/bin/jq /usr/local/bin/jq 
COPY --from=builder /usr/lib/*-linux-*/libjq.so.1 /usr/lib/
COPY --from=builder /usr/lib/*-linux-*/libonig.so.5 /usr/lib/

# init.d script IPFS runs before starting the daemon. Used to manipulate the IPFS config file.
COPY 001-config.sh /container-init.d/001-config.sh

# @todo -- https://github.com/ipfs/go-ds-s3 v0.10.0 no longer works with the above
# Attempts to load the prebuilt plugin from the official image fail with:
#
# Error: error loading plugins: loading plugin /data/ipfs/plugins: plugin.Open("/data/ipfs/plugins"): plugin was built with a different version of package github.com/ipfs/kubo/core/bootstrap
#
# FROM alpine as dependencies

# RUN apk add -U wget

# RUN wget -O /jq https://github.com/stedolan/jq/releases/download/jq-1.6/jq-linux64 \
#   && chmod +x /jq

# RUN wget -O /tmp/go-ds-s3-plugin.tar.gz https://github.com/ipfs/go-ds-s3/releases/download/go-ds-s3-plugin%2Fv0.23.0/go-ds-s3-plugin_v0.23.0_linux_amd64.tar.gz \
#   && tar -xvf /tmp/go-ds-s3-plugin.tar.gz -C /

# # The actual IPFS image we will use
# FROM ipfs/kubo:v0.23.0
# ENV SRC_DIR /kubo

# COPY --from=dependencies /jq /usr/bin/jq
# COPY --from=dependencies /go-ds-s3-plugin/go-ds-s3-plugin /data/ipfs/plugins

# # init.d script IPFS runs before starting the daemon. Used to manipulate the IPFS config file.
# COPY 001-config.sh /container-init.d/001-config.sh