package com.elite.ecommerce.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.elite.ecommerce.model.Category;
import com.elite.ecommerce.model.Product;
import com.elite.ecommerce.repository.ProductRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository repository;

    public List<Product> getAllProducts() {
        return repository.findAll();
    }

    public Optional<Product> getProductById(Long id) {
        return repository.findById(id);
    }

    public List<Product> getProductsByCategory(Category category) {
        return repository.findByCategory(category);
    }

    public Product createProduct(Product product) {
        return repository.save(product);
    }

    public Product updateProduct(Long id, Product productDetails) {
        Product product = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        product.setName(productDetails.getName());
        product.setDescription(productDetails.getDescription());
        product.setPrice(productDetails.getPrice());
        product.setOriginalPrice(productDetails.getOriginalPrice());
        product.setSalePrice(productDetails.getSalePrice());
        product.setOnSale(productDetails.getOnSale());
        product.setBrand(productDetails.getBrand());
        product.setGender(productDetails.getGender());
        product.setMaterial(productDetails.getMaterial());
        product.setFeatured(productDetails.getFeatured());
        product.setIsNew(productDetails.getIsNew());
        product.setCategory(productDetails.getCategory());
        product.setImages(productDetails.getImages());
        product.setSizes(productDetails.getSizes());
        product.setColors(productDetails.getColors());
        product.setStock(productDetails.getStock());
        product.setStatus(productDetails.getStatus());

        return repository.save(product);
    }

    public void deleteProduct(Long id) {
        repository.deleteById(id);
    }
}
