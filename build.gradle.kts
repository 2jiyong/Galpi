import org.springframework.boot.gradle.tasks.bundling.BootJar

plugins {
    java
    id("org.springframework.boot") version "4.1.1"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.galpi"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

repositories {
    mavenCentral()
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.1.1")

    developmentOnly("org.springframework.boot:spring-boot-devtools")
    runtimeOnly("org.postgresql:postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.springframework.boot:spring-boot-webmvc-test")
    testImplementation(platform("org.testcontainers:testcontainers-bom:2.0.5"))
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<JavaCompile> {
    options.compilerArgs.add("-Xlint:deprecation")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

val frontendDirectory = layout.projectDirectory.dir("frontend")
val frontendInstall by tasks.registering(Exec::class) {
    description = "Install frontend dependencies using the lockfile."
    group = "frontend"
    workingDir(frontendDirectory)
    commandLine("pnpm", "install", "--frozen-lockfile")
    inputs.files(
        frontendDirectory.file("package.json"),
        frontendDirectory.file("pnpm-lock.yaml"),
    )
    outputs.dir(frontendDirectory.dir("node_modules"))
}

val frontendBuild by tasks.registering(Exec::class) {
    description = "Build the React frontend for production."
    group = "frontend"
    dependsOn(frontendInstall)
    workingDir(frontendDirectory)
    commandLine("pnpm", "build")
    inputs.files(
        frontendDirectory.file("index.html"),
        frontendDirectory.file("package.json"),
        frontendDirectory.file("tsconfig.json"),
        frontendDirectory.file("tsconfig.app.json"),
        frontendDirectory.file("tsconfig.node.json"),
        frontendDirectory.file("vite.config.ts"),
    )
    inputs.dir(frontendDirectory.dir("src"))
    outputs.dir(frontendDirectory.dir("dist"))
}

tasks.named<BootJar>("bootJar") {
    dependsOn(frontendBuild)
    from(frontendDirectory.dir("dist")) {
        into("BOOT-INF/classes/static")
    }
}

tasks.named<Delete>("clean") {
    delete(frontendDirectory.dir("dist"))
}
