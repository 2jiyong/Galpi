package com.galpi.common.config;

import java.io.IOException;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import org.jspecify.annotations.Nullable;

@Configuration
public class SpaWebConfig implements WebMvcConfigurer {

    private static final String[] BACKEND_ROOTS = {"api", "actuator", "v3", "swagger-ui"};

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new SpaPathResourceResolver());
    }

    private static final class SpaPathResourceResolver extends PathResourceResolver {

        @Override
        @Nullable
        protected Resource getResource(String resourcePath, Resource location) throws IOException {
            Resource requestedResource = location.createRelative(resourcePath);
            if (requestedResource.exists()
                    && requestedResource.isReadable()
                    && checkResource(requestedResource, location)) {
                return requestedResource;
            }

            for (String backendRoot : BACKEND_ROOTS) {
                if (resourcePath.equals(backendRoot) || resourcePath.startsWith(backendRoot + "/")) {
                    return null;
                }
            }

            if (resourcePath.contains(".")) {
                return null;
            }

            Resource index = new ClassPathResource("static/index.html");
            return index.exists() && index.isReadable() ? index : null;
        }
    }
}
