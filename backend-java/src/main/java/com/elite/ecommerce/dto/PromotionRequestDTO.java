package com.elite.ecommerce.dto;

import com.elite.ecommerce.model.PromotionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class PromotionRequestDTO {

    @NotBlank(message = "Internal name is required")
    private String name;

    @NotBlank(message = "Visible title is required")
    private String title;

    private String description;
    private String imageUrl;

    @NotNull(message = "Promotion type is required")
    private PromotionType promotionType;

    private Integer minQuantity;
    private Double promotionalPrice;
    private Double discountPercentage;

    private LocalDateTime startDate;
    private LocalDateTime endDate;

    private Boolean active = false;
    private Boolean showInPopup = false;
    private Boolean showInBanner = false;

    private String ctaText;
    private String ctaUrl;

    private List<Long> productIds = new ArrayList<>();
    private List<String> categories = new ArrayList<>();
}
