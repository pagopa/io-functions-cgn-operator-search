FROM alpine:3.10

RUN apk update \
    && apk add --no-cache postgresql \
    && apk add bash

COPY test-backup /test-backup
COPY init.sh /init.sh

RUN chmod +x /init.sh

CMD ["/init.sh"]