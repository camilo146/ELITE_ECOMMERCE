package com.elite.ecommerce.controller;

import com.elite.ecommerce.dto.PromotionRequestDTO;
import com.elite.ecommerce.dto.PromotionResponseDTO;
import com.elite.ecommerce.service.PromotionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PromotionController {

    private final PromotionService promotionService;

    // ── Public endpoints (/api/promotions/public/**) ──────────────────────────

    @GetMapping("/api/promotions/public/popup")
    public ResponseEntity<List<PromotionResponseDTO>> getPopupPromos() {
        return ResponseEntity.ok(promotionService.getActivePopupPromos());
    }

    @GetMapping("/api/promotions/public/banner")
    public ResponseEntity<List<PromotionResponseDTO>> getBannerPromos() {
        return ResponseEntity.ok(promotionService.getActiveBannerPromos());
    }

    @GetMapping("/api/promotions/public/active")
    public ResponseEntity<List<PromotionResponseDTO>> getActivePromos() {
        return ResponseEntity.ok(promotionService.getAllActivePromos());
    }

    @GetMapping("/api/promotions/public/{id}")
    public ResponseEntity<PromotionResponseDTO> getPublicPromotion(@PathVariable Long id) {
        return ResponseEntity.ok(promotionService.getPublicPromotion(id));
    }

    // ── Admin endpoints (/api/promotions/**) ─────────────────────────────────

    @GetMapping("/api/promotions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PromotionResponseDTO>> getAllPromotions() {
        return ResponseEntity.ok(promotionService.getAllPromotions());
    }

    @GetMapping("/api/promotions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PromotionResponseDTO> getPromotion(@PathVariable Long id) {
        return ResponseEntity.ok(promotionService.getPromotion(id));
    }

    @PostMapping("/api/promotions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PromotionResponseDTO> createPromotion(
            @Valid @RequestBody PromotionRequestDTO dto) {
        return ResponseEntity.ok(promotionService.createPromotion(dto));
    }

    @PutMapping("/api/promotions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PromotionResponseDTO> updatePromotion(
            @PathVariable Long id, @Valid @RequestBody PromotionRequestDTO dto) {
        return ResponseEntity.ok(promotionService.updatePromotion(id, dto));
    }

    @DeleteMapping("/api/promotions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deletePromotion(@PathVariable Long id) {
        promotionService.deletePromotion(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/api/promotions/{id}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PromotionResponseDTO> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(promotionService.toggleActive(id));
    }
}
