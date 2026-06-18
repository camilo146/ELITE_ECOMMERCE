package com.elite.ecommerce.model;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class Address {
    private String fullName;
    private String phone;
    private String address; // Renamed from street to match frontend
    private String city;
    private String state;
    private String zipCode;
    private String country;
}
