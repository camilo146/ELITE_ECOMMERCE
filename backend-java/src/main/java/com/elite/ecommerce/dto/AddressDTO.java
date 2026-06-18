package com.elite.ecommerce.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AddressDTO {

    @NotBlank(message = "Full name is required")
    @Size(min = 3, max = 100)
    private String fullName;

    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "^[0-9+\\-\\s()]{7,20}$", message = "Invalid phone number")
    private String phone;

    @NotBlank(message = "Address is required")
    @Size(min = 10, max = 255)
    private String address;

    @NotBlank(message = "City is required")
    @Size(max = 100)
    private String city;

    @Size(max = 100)
    private String state;

    @Size(max = 20)
    private String zipCode;

    @Size(max = 100)
    private String country;
}
