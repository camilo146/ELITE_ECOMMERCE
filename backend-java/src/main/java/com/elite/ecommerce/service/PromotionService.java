package com.elite.ecommerce.service;

import com.elite.ecommerce.dto.OrderItemRequestDTO;
import com.elite.ecommerce.dto.PromotionRequestDTO;
import com.elite.ecommerce.dto.PromotionResponseDTO;
import com.elite.ecommerce.model.Product;
import com.elite.ecommerce.model.Promotion;
import com.elite.ecommerce.model.PromotionType;
import com.elite.ecommerce.repository.ProductRepository;
import com.elite.ecommerce.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class PromotionService {

    private final PromotionRepository promotionRepository;
    private final ProductRepository productRepository;

    // ── Public queries ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PromotionResponseDTO> getActivePopupPromos() {
        return promotionRepository.findActivePopup(LocalDateTime.now())
            .stream().map(PromotionResponseDTO::from).toList();
    }

    @Transactional(readOnly = true)
    public List<PromotionResponseDTO> getActiveBannerPromos() {
        return promotionRepository.findActiveBanner(LocalDateTime.now())
            .stream().map(PromotionResponseDTO::from).toList();
    }

    @Transactional(readOnly = true)
    public List<PromotionResponseDTO> getAllActivePromos() {
        return promotionRepository.findAllActive(LocalDateTime.now())
            .stream().map(PromotionResponseDTO::from).toList();
    }

    @Transactional(readOnly = true)
    public PromotionResponseDTO getPublicPromotion(Long id) {
        Promotion promo = promotionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Promotion not found"));
        if (!promo.getActive()) {
            throw new ResponseStatusException(NOT_FOUND, "Promotion not found");
        }
        return PromotionResponseDTO.from(promo);
    }

    // ── Admin queries ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PromotionResponseDTO> getAllPromotions() {
        return promotionRepository.findAll().stream()
            .map(PromotionResponseDTO::from).toList();
    }

    @Transactional(readOnly = true)
    public PromotionResponseDTO getPromotion(Long id) {
        return PromotionResponseDTO.from(
            promotionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Promotion not found"))
        );
    }

    // ── Admin CRUD ────────────────────────────────────────────────────────────

    @Transactional
    public PromotionResponseDTO createPromotion(PromotionRequestDTO dto) {
        validateDto(dto);
        Promotion promo = buildFromDto(new Promotion(), dto);
        return PromotionResponseDTO.from(promotionRepository.save(promo));
    }

    @Transactional
    public PromotionResponseDTO updatePromotion(Long id, PromotionRequestDTO dto) {
        validateDto(dto);
        Promotion promo = promotionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Promotion not found"));
        buildFromDto(promo, dto);
        return PromotionResponseDTO.from(promotionRepository.save(promo));
    }

    @Transactional
    public void deletePromotion(Long id) {
        if (!promotionRepository.existsById(id)) {
            throw new ResponseStatusException(NOT_FOUND, "Promotion not found");
        }
        promotionRepository.deleteById(id);
    }

    @Transactional
    public PromotionResponseDTO toggleActive(Long id) {
        Promotion promo = promotionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Promotion not found"));
        promo.setActive(!promo.getActive());
        return PromotionResponseDTO.from(promotionRepository.save(promo));
    }

    // ── Discount validation (called from OrderService) ────────────────────────

    @Transactional(readOnly = true)
    public double validateAndCalculateDiscount(Long promotionId, List<OrderItemRequestDTO> items) {
        Promotion promo = promotionRepository.findById(promotionId)
            .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Promotion not found: " + promotionId));

        validatePromotionActive(promo);

        Set<Long> eligibleProductIds = new HashSet<>();
        for (Product p : promo.getProducts()) eligibleProductIds.add(p.getId());
        Set<String> eligibleCategories = new HashSet<>(promo.getCategories());

        record EligibleItem(OrderItemRequestDTO dto, Product product) {}
        List<EligibleItem> eligibleItems = new ArrayList<>();

        for (OrderItemRequestDTO item : items) {
            Product product = productRepository.findById(item.getProductId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND,
                    "Product not found: " + item.getProductId()));
            boolean byProduct = eligibleProductIds.contains(product.getId());
            boolean byCategory = eligibleCategories.contains(product.getCategory().name());
            if (byProduct || byCategory) {
                eligibleItems.add(new EligibleItem(item, product));
            }
        }

        int totalEligibleQty = eligibleItems.stream()
            .mapToInt(ei -> ei.dto().getQuantity()).sum();

        if (promo.getPromotionType() == PromotionType.FIXED_PRICE_BUNDLE) {
            int required = promo.getMinQuantity() != null ? promo.getMinQuantity() : 1;
            if (totalEligibleQty < required) {
                throw new ResponseStatusException(BAD_REQUEST,
                    "La promoción requiere mínimo " + required + " productos elegibles");
            }
            // Calculate original price for exactly minQuantity eligible items (V1: one bundle)
            double originalPrice = 0;
            int counted = 0;
            for (EligibleItem ei : eligibleItems) {
                if (counted >= required) break;
                int qty = Math.min(ei.dto().getQuantity(), required - counted);
                originalPrice += ei.product().getPrice() * qty;
                counted += qty;
            }
            double discount = originalPrice - promo.getPromotionalPrice();
            return Math.max(discount, 0);

        } else if (promo.getPromotionType() == PromotionType.PERCENTAGE_DISCOUNT) {
            if (eligibleItems.isEmpty()) {
                throw new ResponseStatusException(BAD_REQUEST,
                    "Ningún producto del pedido es elegible para esta promoción");
            }
            double totalEligiblePrice = eligibleItems.stream()
                .mapToDouble(ei -> ei.product().getPrice() * ei.dto().getQuantity())
                .sum();
            double pct = promo.getDiscountPercentage() != null ? promo.getDiscountPercentage() : 0;
            return totalEligiblePrice * (pct / 100.0);
        }

        return 0;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void validatePromotionActive(Promotion promo) {
        if (!promo.getActive()) {
            throw new ResponseStatusException(BAD_REQUEST, "La promoción no está activa");
        }
        LocalDateTime now = LocalDateTime.now();
        if (promo.getStartDate() != null && now.isBefore(promo.getStartDate())) {
            throw new ResponseStatusException(BAD_REQUEST, "La promoción aún no ha iniciado");
        }
        if (promo.getEndDate() != null && now.isAfter(promo.getEndDate())) {
            throw new ResponseStatusException(BAD_REQUEST, "La promoción ha expirado");
        }
    }

    private void validateDto(PromotionRequestDTO dto) {
        if (dto.getPromotionType() == PromotionType.FIXED_PRICE_BUNDLE) {
            if (dto.getMinQuantity() == null || dto.getMinQuantity() < 2) {
                throw new ResponseStatusException(BAD_REQUEST,
                    "FIXED_PRICE_BUNDLE requires minQuantity >= 2");
            }
            if (dto.getPromotionalPrice() == null || dto.getPromotionalPrice() <= 0) {
                throw new ResponseStatusException(BAD_REQUEST,
                    "FIXED_PRICE_BUNDLE requires a positive promotionalPrice");
            }
        }
        if (dto.getPromotionType() == PromotionType.PERCENTAGE_DISCOUNT) {
            if (dto.getDiscountPercentage() == null
                || dto.getDiscountPercentage() <= 0
                || dto.getDiscountPercentage() > 100) {
                throw new ResponseStatusException(BAD_REQUEST,
                    "PERCENTAGE_DISCOUNT requires discountPercentage between 1 and 100");
            }
        }
        if (dto.getProductIds().isEmpty() && dto.getCategories().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST,
                "At least one product or category must be specified");
        }
    }

    private Promotion buildFromDto(Promotion promo, PromotionRequestDTO dto) {
        promo.setName(dto.getName());
        promo.setTitle(dto.getTitle());
        promo.setDescription(dto.getDescription());
        promo.setImageUrl(dto.getImageUrl());
        promo.setPromotionType(dto.getPromotionType());
        promo.setMinQuantity(dto.getMinQuantity());
        promo.setPromotionalPrice(dto.getPromotionalPrice());
        promo.setDiscountPercentage(dto.getDiscountPercentage());
        promo.setStartDate(dto.getStartDate());
        promo.setEndDate(dto.getEndDate());
        promo.setActive(dto.getActive() != null ? dto.getActive() : false);
        promo.setShowInPopup(dto.getShowInPopup() != null ? dto.getShowInPopup() : false);
        promo.setShowInBanner(dto.getShowInBanner() != null ? dto.getShowInBanner() : false);
        promo.setCtaText(dto.getCtaText());
        promo.setCtaUrl(dto.getCtaUrl());
        promo.setCategories(dto.getCategories() != null ? dto.getCategories() : new ArrayList<>());

        List<Product> products = new ArrayList<>();
        if (dto.getProductIds() != null) {
            for (Long pid : dto.getProductIds()) {
                Product p = productRepository.findById(pid)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found: " + pid));
                products.add(p);
            }
        }
        promo.setProducts(products);

        return promo;
    }
}
