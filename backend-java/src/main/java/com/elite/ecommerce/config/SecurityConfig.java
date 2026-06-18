package com.elite.ecommerce.config;

import com.elite.ecommerce.security.JwtAuthenticationFilter;
import com.elite.ecommerce.security.RateLimitFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AuthenticationProvider authenticationProvider;
    private final RateLimitFilter rateLimitFilter;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)

            // ── Security Headers ──────────────────────────────────────────
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp.policyDirectives(
                    // default: same-origin only
                    "default-src 'self'; " +
                    // images: own domain + Unsplash CDN only
                    "img-src 'self' https://images.unsplash.com data: blob:; " +
                    // scripts: own domain only, no eval, no inline
                    "script-src 'self'; " +
                    // styles: allow inline (Tailwind CSS generates inline styles)
                    "style-src 'self' 'unsafe-inline'; " +
                    // fonts: own domain only
                    "font-src 'self'; " +
                    // API calls: own domain only
                    "connect-src 'self'; " +
                    // media: none
                    "media-src 'none'; " +
                    // iframes: never (clickjacking)
                    "frame-ancestors 'none'; " +
                    // base tag: own domain only (prevents base-tag hijacking)
                    "base-uri 'self'; " +
                    // form submissions: own domain + MP checkout
                    "form-action 'self' https://www.mercadopago.com; " +
                    // upgrade all HTTP sub-resources to HTTPS
                    "upgrade-insecure-requests"
                ))
                // X-Frame-Options: DENY
                .frameOptions(frame -> frame.deny())
                // X-Content-Type-Options: nosniff
                .contentTypeOptions(ct -> {})
                // HSTS: 2 years, includeSubDomains, preload
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(63072000)
                    .preload(true)
                )
                // Referrer-Policy: strict-origin-when-cross-origin
                .referrerPolicy(ref ->
                    ref.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                )
                // Permissions-Policy
                .permissionsPolicy(pp -> pp.policy(
                    "camera=(), microphone=(), geolocation=(), " +
                    "payment=(self https://www.mercadopago.com), " +
                    "usb=(), bluetooth=(), magnetometer=(), accelerometer=()"
                ))
            )

            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // ── Endpoint Authorization ────────────────────────────────────
            .authorizeHttpRequests(auth -> auth
                // Auth endpoints — public
                .requestMatchers(
                    "/api/auth/login",
                    "/api/auth/register",
                    "/api/auth/verify-email",
                    "/api/auth/resend-verification",
                    "/api/auth/refresh",
                    "/api/auth/forgot-password",
                    "/api/auth/reset-password"
                ).permitAll()
                // Public catalog
                .requestMatchers("/api/products/**").permitAll()
                // MP webhook — public (signature verified in controller)
                .requestMatchers("/api/payments/notifications").permitAll()
                // Static file serving
                .requestMatchers("/uploads/**").permitAll()
                // Spring error handler
                .requestMatchers("/error").permitAll()
                // Actuator health — needed for Docker health check (no sensitive data)
                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                // Everything else requires a valid JWT
                .anyRequest().authenticated()
            )

            .authenticationProvider(authenticationProvider)
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Explicit allowlist — NEVER use wildcard with credentials
        config.setAllowedOrigins(List.of(frontendUrl));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(Arrays.asList(
                "Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"
        ));
        config.setExposedHeaders(List.of("Set-Cookie"));
        config.setAllowCredentials(true);  // Required for HttpOnly cookies
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
