FROM node:22-bookworm-slim AS frontend-build

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM composer:2 AS composer-bin

FROM php:8.3-apache-bookworm

ENV APP_ENV=production \
    APP_DEBUG=false \
    DB_CONNECTION=mysql \
    LOG_CHANNEL=stderr \
    LOG_LEVEL=info \
    APACHE_DOCUMENT_ROOT=/var/www/html/public

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libfreetype6-dev \
        libicu-dev \
        libjpeg62-turbo-dev \
        libpng-dev \
        libwebp-dev \
        libzip-dev \
        passwd \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j2 \
        bcmath \
        exif \
        gd \
        intl \
        pdo_mysql \
        zip \
    && php -r 'foreach (["bcmath", "curl", "dom", "exif", "fileinfo", "gd", "intl", "mbstring", "opcache", "pdo_mysql", "simplexml", "xml", "xmlreader", "xmlwriter", "zip"] as $extension) { if (! extension_loaded($extension)) { fwrite(STDERR, "Missing PHP extension: {$extension}\\n"); exit(1); } }' \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer-bin /usr/bin/composer /usr/local/bin/composer

WORKDIR /var/www/html

RUN a2enmod rewrite headers \
    && sed -ri 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/000-default.conf \
    && if ! getent group 1000 >/dev/null; then groupadd --gid 1000 render-secrets; fi \
    && usermod -a -G 1000 www-data

COPY backend/ ./

RUN composer install \
        --no-dev \
        --no-interaction \
        --no-progress \
        --prefer-dist \
        --optimize-autoloader \
    && printf '%s\n' \
        '<Directory /var/www/html/public>' \
        '    Options FollowSymLinks' \
        '    AllowOverride All' \
        '    Require all granted' \
        '</Directory>' \
        'DirectoryIndex index.html index.php' \
        > /etc/apache2/conf-available/laravel-public.conf \
    && a2enconf laravel-public \
    && mkdir -p \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache \
    && chmod +x docker/start.sh

COPY --from=frontend-build /frontend/dist/ ./public/
COPY backend/docker/combined.htaccess ./public/.htaccess

EXPOSE 10000

CMD ["/var/www/html/docker/start.sh"]
