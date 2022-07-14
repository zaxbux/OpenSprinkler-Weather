FROM rust:alpine

VOLUME /output/
ENTRYPOINT ["/usr/src/baseline-eto/entrypoint.sh"]

WORKDIR /usr/src/baseline-eto

COPY . .

RUN apk --update add imagemagick gcc libc-dev && \
	rm -rf /var/lib/apt/lists/* && \
	chmod +x entrypoint.sh && \
	cargo install --path .

WORKDIR /output