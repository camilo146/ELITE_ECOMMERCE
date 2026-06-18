package com.elite.ecommerce.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
    }

    // CORS is handled in SecurityConfig
    // @Override
    // public void addCorsMappings(CorsRegistry registry) {
    // registry.addMapping("/**")
    // .allowedOrigins("http://localhost:5173", "http://localhost:3000") // Allow
    // frontend
    // .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
    // .allowedHeaders("*")
    // .allowCredentials(true);
    // }
}
