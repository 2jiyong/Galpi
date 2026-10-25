CREATE TABLE galpis (
    id UUID PRIMARY KEY,
    title VARCHAR(50) NOT NULL,
    description VARCHAR(200),
    display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT ck_galpis_title_not_blank CHECK (length(btrim(title)) > 0)
);

CREATE TABLE phrases (
    id UUID PRIMARY KEY,
    galpi_id UUID NOT NULL,
    content VARCHAR(500) NOT NULL,
    favorite BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_phrases_galpi FOREIGN KEY (galpi_id) REFERENCES galpis(id) ON DELETE CASCADE,
    CONSTRAINT ck_phrases_content_not_blank CHECK (length(btrim(content)) > 0)
);

CREATE INDEX idx_phrases_galpi_order ON phrases(galpi_id, display_order, created_at);

CREATE TABLE phrase_sources (
    phrase_id UUID NOT NULL,
    source_order INTEGER NOT NULL CHECK (source_order BETWEEN 0 AND 9),
    source VARCHAR(200) NOT NULL,
    CONSTRAINT pk_phrase_sources PRIMARY KEY (phrase_id, source_order),
    CONSTRAINT fk_phrase_sources_phrase FOREIGN KEY (phrase_id) REFERENCES phrases(id) ON DELETE CASCADE,
    CONSTRAINT ck_phrase_sources_not_blank CHECK (length(btrim(source)) > 0)
);
