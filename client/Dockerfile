FROM node:20-alpine AS builder
WORKDIR /app

COPY client/package.json ./
RUN npm install --legacy-peer-deps

COPY client .
RUN npm run build


FROM nginx:1.25-alpine AS production

COPY --from=builder /app/build /usr/share/nginx/html
COPY ./client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
