package com.galpi.phrase.adapter.in.web;

import com.galpi.common.domain.InvalidFieldException;
import com.galpi.phrase.application.port.in.PhraseUseCase;
import com.galpi.phrase.domain.Phrase;
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

@Tag(name = "Phrase", description = "문장 관리")
@RestController
@RequestMapping("/api")
public class PhraseController {

    private final PhraseUseCase useCase;

    public PhraseController(PhraseUseCase useCase) {
        this.useCase = useCase;
    }

    @Operation(summary = "갈피의 문장 목록 (즐겨찾기 먼저, 갈피 정렬 설정 순)")
    @GetMapping("/galpis/{galpiId}/phrases")
    public List<PhraseResponse> list(@PathVariable UUID galpiId) {
        return useCase.listPhrases(galpiId).stream().map(PhraseResponse::from).toList();
    }

    @Operation(summary = "문장 추가")
    @PostMapping("/galpis/{galpiId}/phrases")
    public ResponseEntity<PhraseResponse> create(@PathVariable UUID galpiId, @RequestBody PhraseRequest request) {
        Phrase created = useCase.createPhrase(galpiId, request.content(), request.sources());
        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/phrases/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(PhraseResponse.from(created));
    }

    @Operation(summary = "문장 수정 (galpiId가 다르면 그 갈피로 이동)")
    @PutMapping("/phrases/{id}")
    public PhraseResponse update(@PathVariable UUID id, @RequestBody PhraseRequest request) {
        return PhraseResponse.from(useCase.updatePhrase(id, request.content(), request.sources(), request.galpiId()));
    }

    @Operation(summary = "문장 삭제")
    @DeleteMapping("/phrases/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        useCase.deletePhrase(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "즐겨찾기 켜기/끄기")
    @PutMapping("/phrases/{id}/favorite")
    public PhraseResponse changeFavorite(@PathVariable UUID id, @RequestBody FavoriteRequest request) {
        if (request.favorite() == null) {
            throw new InvalidFieldException("favorite", "favorite is required");
        }
        return PhraseResponse.from(useCase.changeFavorite(id, request.favorite()));
    }
}
