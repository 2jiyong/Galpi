package com.galpi.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI galpiOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Galpi API")
                .description("갈피 서비스 API 문서")
                .version("v1"));
    }
}
