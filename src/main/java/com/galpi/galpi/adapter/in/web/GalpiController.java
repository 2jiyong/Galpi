package com.galpi.galpi.adapter.in.web;

import com.galpi.galpi.application.port.in.GalpiSummary;
import com.galpi.galpi.application.port.in.GalpiUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@Tag(name = "Galpi", description = "갈피 관리")
@RestController
@RequestMapping("/api/galpis")
public class GalpiController {

    private final GalpiUseCase useCase;

    public GalpiController(GalpiUseCase useCase) {
        this.useCase = useCase;
    }

    @Operation(summary = "갈피 목록 (만든 순서)")
    @GetMapping
    public List<GalpiResponse> list() {
        return useCase.listGalpis().stream().map(GalpiResponse::from).toList();
    }

    @Operation(summary = "갈피 만들기")
    @PostMapping
    public ResponseEntity<GalpiResponse> create(@RequestBody GalpiRequest request) {
        GalpiSummary created = useCase.createGalpi(request.title(), request.description());
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.galpi().getId())
                .toUri();
        return ResponseEntity.created(location).body(GalpiResponse.from(created));
    }

    @Operation(summary = "갈피 조회")
    @GetMapping("/{id}")
    public GalpiResponse get(@PathVariable UUID id) {
        return GalpiResponse.from(useCase.getGalpi(id));
    }

    @Operation(summary = "갈피 수정")
    @PutMapping("/{id}")
    public GalpiResponse update(@PathVariable UUID id, @RequestBody GalpiRequest request) {
        return GalpiResponse.from(useCase.updateGalpi(id, request.title(), request.description()));
    }

    @Operation(summary = "갈피 삭제 (문장 포함)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        useCase.deleteGalpi(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "최근 본 시각 기록")
    @PostMapping("/{id}/views")
    public ResponseEntity<Void> markViewed(@PathVariable UUID id) {
        useCase.markViewed(id);
        return ResponseEntity.noContent().build();
    }
}
