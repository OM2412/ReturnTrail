FROM node:24-alpine AS frontend
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG PUBLIC_SITE_URL
ENV VITE_PUBLIC_URL=$PUBLIC_SITE_URL
RUN npm run build

FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /build/backend
COPY backend/pom.xml ./
RUN mvn -B -ntp dependency:go-offline
COPY backend/src ./src
COPY --from=frontend /build/frontend/dist ./src/main/resources/static
RUN mvn -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=backend /build/backend/target/backend-0.0.1-SNAPSHOT.jar /app/app.jar
USER 10001:10001
ENV SERVER_ADDRESS=0.0.0.0 SERVER_PORT=8085
EXPOSE 8085
ENTRYPOINT ["java","-XX:MaxRAMPercentage=70","-jar","/app/app.jar"]
