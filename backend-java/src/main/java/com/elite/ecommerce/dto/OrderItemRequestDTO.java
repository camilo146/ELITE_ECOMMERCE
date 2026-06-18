package com.elite.ecommerce.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class OrderItemRequestDTO {

    @NotNull(message = "Product ID is required")
    @Positive(message = "Product ID must be positive")
    private Long productId;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 50, message = "Quantity cannot exceed 50 per item")
    private Integer quantity;

    @Size(max = 20)
    private String size;

    @Size(max = 50)
    private String color;
}
