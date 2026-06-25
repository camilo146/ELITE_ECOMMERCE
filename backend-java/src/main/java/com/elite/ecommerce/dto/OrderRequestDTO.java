package com.elite.ecommerce.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

@Data
public class OrderRequestDTO {

    @NotNull(message = "Items are required")
    @Size(min = 1, max = 20, message = "Order must have 1-20 items")
    @Valid
    private List<OrderItemRequestDTO> items;

    @NotNull(message = "Shipping address is required")
    @Valid
    private AddressDTO shippingAddress;

    @NotBlank(message = "Payment method is required")
    @Pattern(regexp = "^(mercadopago|cash_on_delivery)$", message = "Invalid payment method")
    private String paymentMethod;

    private Long promotionId;
}
