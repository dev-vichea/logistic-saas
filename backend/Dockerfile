FROM php:8.4-fpm-alpine
RUN apk add --no-cache postgresql-dev icu-dev libzip-dev oniguruma-dev git unzip \
    && docker-php-ext-install pdo_pgsql intl zip bcmath pcntl opcache
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN composer install --no-interaction --prefer-dist --no-scripts
COPY . .
RUN composer dump-autoload --optimize \
    && chown -R www-data:www-data storage bootstrap/cache
EXPOSE 9000
CMD ["php-fpm"]
