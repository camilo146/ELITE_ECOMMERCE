# ── Build stage ───────────────────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build
WORKDIR /build

# Download dependencies first (cached layer — only invalidated if pom.xml changes)
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Build the application
COPY src ./src
RUN mvn clean package -DskipTests -q

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

# Non-root user — containers should NEVER run as root
RUN addgroup -S elite && adduser -S elite -G elite

WORKDIR /app

# Copy artifact from build stage
COPY --from=build /build/target/*.jar app.jar

# Uploads directory owned by the app user
RUN mkdir -p /app/uploads && chown elite:elite /app/uploads

USER elite

EXPOSE 8080

# JVM tuning for containerized environments:
#   -XX:+UseContainerSupport      respect cgroup memory limits
#   -XX:MaxRAMPercentage=75       use 75% of container RAM for heap
#   -XX:+UseG1GC                  G1 GC is better for heap > 1GB
#   -Djava.security.egd            faster startup entropy for SecureRandom
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-XX:+UseG1GC", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "app.jar"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health/liveness || exit 1
