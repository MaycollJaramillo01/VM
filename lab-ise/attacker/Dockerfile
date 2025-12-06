FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        curl \
        nmap \
        netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY startup.sh /startup.sh
RUN chmod +x /startup.sh

CMD ["/startup.sh"]
