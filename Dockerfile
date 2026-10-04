FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY deploy/nginx-docker.conf /etc/nginx/conf.d/default.conf
