FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /build
COPY backend/pom.xml ./
RUN mvn -B -ntp dependency:go-offline
COPY backend/src ./src
RUN mvn -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=backend /build/target/backend-0.0.1-SNAPSHOT.jar /app/app.jar
USER 10001:10001
ENV SERVER_ADDRESS=0.0.0.0
EXPOSE 8085
# Render assigns PORT at runtime. Do not embed keys or database passwords in this image.
ENTRYPOINT ["sh", "-c", "exec java -XX:MaxRAMPercentage=60 -XX:+UseSerialGC -jar /app/app.jar --server.port=\"${PORT:-8085}\""]
