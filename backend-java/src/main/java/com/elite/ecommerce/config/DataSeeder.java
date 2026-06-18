package com.elite.ecommerce.config;

import com.elite.ecommerce.model.*;
import com.elite.ecommerce.repository.ProductRepository;
import com.elite.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Seed data ONLY for development/test environments.
 * Never runs in production (profile != "prod").
 *
 * In production, create the first admin account manually:
 *   POST /api/auth/register with a strong password, then update role via DB migration.
 */
@Component
@Profile("!prod")
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${seed.admin.email:admin@elite.com}")
    private String adminEmail;

    @Value("${seed.admin.password:#{null}}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        seedUsers();
        seedProducts();
    }

    private void seedUsers() {
        if (!userRepository.existsByEmail(adminEmail)) {
            String password = adminPassword;
            if (password == null || password.isBlank()) {
                // Generate a random password — admin must change on first login
                password = java.util.UUID.randomUUID().toString();
                log.warn("==========================================================");
                log.warn("ADMIN ACCOUNT CREATED — CHANGE PASSWORD IMMEDIATELY");
                log.warn("Email: {}", adminEmail);
                log.warn("Temp password: {}", password);
                log.warn("==========================================================");
            }

            User admin = User.builder()
                    .username("admin")
                    .email(adminEmail)
                    .password(passwordEncoder.encode(password))
                    .role(Role.ADMIN)
                    .emailVerified(true)  // seed users are pre-verified
                    .build();
            userRepository.save(admin);
        }

        if (!userRepository.existsByEmail("user@elite.com")) {
            User user = User.builder()
                    .username("testuser")
                    .email("user@elite.com")
                    .password(passwordEncoder.encode("TestUser#2024!"))
                    .role(Role.USER)
                    .emailVerified(true)
                    .build();
            userRepository.save(user);
            log.info("Test user seeded: user@elite.com");
        }
    }

    private void seedProducts() {
        if (productRepository.count() > 0) return;

        Product jeans1 = Product.builder()
                .name("Jeans Slim Fit Hombre")
                .description("Jeans de corte slim fit en denim de alta calidad.")
                .price(129000.00)
                .salePrice(159000.00)
                .onSale(true)
                .category(Category.JEANS)
                .gender("HOMBRE")
                .material("98% Algodón, 2% Elastano")
                .brand("ELITE")
                .featured(true)
                .isNew(false)
                .stock(80)
                .status(ProductStatus.ACTIVE)
                .sizes(List.of("28", "30", "32", "34", "36"))
                .colors(List.of("Azul Oscuro", "Negro", "Gris"))
                .images(List.of(
                        "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=800&q=80"))
                .build();

        Product bermuda = Product.builder()
                .name("Bermuda Cargo Unisex")
                .description("Bermuda estilo cargo con bolsillos laterales.")
                .price(89000.00)
                .category(Category.BERMUDAS)
                .gender("UNISEX")
                .material("95% Algodón, 5% Poliéster")
                .brand("ELITE")
                .featured(false)
                .isNew(true)
                .stock(100)
                .status(ProductStatus.ACTIVE)
                .sizes(List.of("S", "M", "L", "XL", "XXL"))
                .colors(List.of("Beige", "Negro", "Verde Militar"))
                .images(List.of(
                        "https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=800&q=80"))
                .build();

        Product camiseta = Product.builder()
                .name("Camiseta Oversize Básica")
                .description("Camiseta de corte oversize en algodón premium.")
                .price(55000.00)
                .category(Category.CAMISETAS)
                .gender("UNISEX")
                .material("100% Algodón Peinado")
                .brand("ELITE")
                .featured(true)
                .isNew(true)
                .stock(150)
                .status(ProductStatus.ACTIVE)
                .sizes(List.of("XS", "S", "M", "L", "XL", "XXL"))
                .colors(List.of("Blanco", "Negro", "Gris", "Beige"))
                .images(List.of(
                        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80"))
                .build();

        productRepository.saveAll(Arrays.asList(jeans1, bermuda, camiseta));
        log.info("Sample products seeded");
    }
}
