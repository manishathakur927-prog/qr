#!/bin/sh
set -eu

: "${PORT:=10000}"
: "${APP_KEY:?Set APP_KEY in the Render environment; startup will not generate one.}"

case "$PORT" in
    ''|*[!0-9]*)
        echo "PORT must be a numeric TCP port." >&2
        exit 1
        ;;
esac

if [ "${DB_CONNECTION:-mysql}" = "mysql" ]; then
    : "${MYSQL_ATTR_SSL_CA:?Set MYSQL_ATTR_SSL_CA to the mounted Aiven CA certificate path.}"
    if [ ! -r "$MYSQL_ATTR_SSL_CA" ]; then
        echo "The MYSQL_ATTR_SSL_CA file is not readable: $MYSQL_ATTR_SSL_CA" >&2
        exit 1
    fi
fi

sed -ri "s/^Listen 80$/Listen 0.0.0.0:${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

exec apache2-foreground
