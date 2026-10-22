package com.galpi.common.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Health", description = "Galpi API 상태 확인")
@RestController
@RequestMapping("/api/health")
public class HealthController {

    @Operation(summary = "API 상태 확인")
    @GetMapping
    public HealthResponse health() {
        return new HealthResponse("UP", "galpi");
    }

    public record HealthResponse(String status, String application) {
    }
}
