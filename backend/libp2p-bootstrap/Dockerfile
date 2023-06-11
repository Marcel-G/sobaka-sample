FROM messense/rust-musl-cross:x86_64-musl AS builder

WORKDIR /app

COPY ./ .

# remove the line below when switching to >=rust:1.70.0. sparse mode is planned to be the default in Rust 1.70.0
ENV CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse

RUN cargo build \
  --target x86_64-unknown-linux-musl \
  --release

FROM scratch
COPY --from=builder \
  /app/target/x86_64-unknown-linux-musl/release/rust-libp2p-webrtc-peer \
  /usr/local/bin/rust-libp2p-webrtc-peer

CMD ["rust-libp2p-webrtc-peer"]