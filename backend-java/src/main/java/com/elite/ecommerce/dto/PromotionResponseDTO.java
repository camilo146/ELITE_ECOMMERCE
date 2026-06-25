package com.elite.ecommerce.dto;

import com.elite.ecommerce.model.Category;
import com.elite.ecommerce.model.Promotion;
import com.elite.ecommerce.model.PromotionType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PromotionResponseDTO {

    private Long id;
    private String name;
    private String title;
    private String description;
    private String imageUrl;
    private PromotionType promotionType;
    private Integer minQuantity;
    private Double promotionalPrice;
    private Double discountPercentage;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Boolean active;
    private Boolean showInPopup;
    private Boolean showInBanner;
    private String ctaText;
    private String ctaUrl;
    private List<ProductSummary> products;
    private List<String> categories;
    private LocalDateTime createdAt;

    @Data
    @Builder
    public static class ProductSummary {
        private Long id;
        private String name;
        private Double price;
        private Double originalPrice;
        private List<String> images;
        private List<String> sizes;
        private List<String> colors;
        private Category category;
        private Integer stock;
    }

    public static PromotionResponseDTO from(Promotion p) {
        List<ProductSummary> productSummaries = p.getProducts().stream()
            .map(prod -> ProductSummary.builder()
                .id(prod.getId())
                .name(prod.getName())
                .price(prod.getPrice())
                .originalPrice(prod.getOriginalPrice())
                .images(prod.getImages())
                .sizes(prod.getSizes())
                .colors(prod.getColors())
                .category(prod.getCategory())
                .stock(prod.getStock())
                .build())
            .toList();

        return PromotionResponseDTO.builder()
            .id(p.getId())
            .name(p.getName())
            .title(p.getTitle())
            .description(p.getDescription())
            .imageUrl(p.getImageUrl())
            .promotionType(p.getPromotionType())
            .minQuantity(p.getMinQuantity())
            .promotionalPrice(p.getPromotionalPrice())
            .discountPercentage(p.getDiscountPercentage())
            .startDate(p.getStartDate())
            .endDate(p.getEndDate())
            .active(p.getActive())
            .showInPopup(p.getShowInPopup())
            .showInBanner(p.getShowInBanner())
            .ctaText(p.getCtaText())
            .ctaUrl(p.getCtaUrl())
            .products(productSummaries)
            .categories(p.getCategories())
            .createdAt(p.getCreatedAt())
            .build();
    }
}
