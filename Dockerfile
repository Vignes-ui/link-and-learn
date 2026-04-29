FROM php:8.2-apache

RUN docker-php-ext-install pdo pdo_mysql

WORKDIR /var/www/html

COPY backend /var/www/html

RUN mkdir -p /var/www/html/public/uploads \
    && chown -R www-data:www-data /var/www/html/public/uploads

RUN a2enmod rewrite

COPY backend/apache-render.conf /etc/apache2/ports.conf
COPY backend/render-vhost.conf /etc/apache2/sites-available/000-default.conf

EXPOSE 10000
