package com.galpi.galpi.adapter.in.web;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.galpi.support.PostgresIntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class GalpiApiIntegrationTest extends PostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void galpiLifecycleThroughApi() throws Exception {
        String created = mockMvc.perform(post("/api/galpis").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"클라이밍\",\"description\":\"운동 전에\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(created, "$.id");

        mockMvc.perform(get("/api/galpis")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
        mockMvc.perform(post("/api/galpis/" + id + "/views")).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/galpis/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lastViewedAt").isNotEmpty())
                .andExpect(jsonPath("$.phraseCount").value(0));
        mockMvc.perform(put("/api/galpis/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"클라이밍\",\"description\":\"\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").isEmpty());
        mockMvc.perform(delete("/api/galpis/" + id)).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/galpis/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void rejectsOverlongTitleWithFieldError() throws Exception {
        mockMvc.perform(post("/api/galpis").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + "가".repeat(51) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("title"));
    }
}
