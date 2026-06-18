package com.elite.ecommerce.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthenticationResponse {
    private Long id;
    private String token;        // Only included in API client flows; omitted for cookie flows
    private String username;
    private String role;
    private Boolean emailVerificationRequired;  // Set true when registration sends verification email
}
