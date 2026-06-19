package com.elite.ecommerce.controller;

import net.coobird.thumbnailator.Thumbnails;
import org.apache.tika.Tika;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private static final Logger log = LoggerFactory.getLogger(UploadController.class);

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );
    private static final long MAX_FILE_SIZE_BYTES = 50L * 1024 * 1024;
    private static final int  MAX_DIMENSION        = 1400;
    private static final float OUTPUT_QUALITY      = 0.85f;

    private final Path rootLocation;
    private final Tika tika = new Tika();

    public UploadController() {
        this.rootLocation = Paths.get("uploads").toAbsolutePath().normalize();
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage directory", e);
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("image") MultipartFile file) {
        return ResponseEntity.ok(storeFile(file));
    }

    @PostMapping("/profile")
    public ResponseEntity<Map<String, String>> uploadProfile(@RequestParam("image") MultipartFile file) {
        return ResponseEntity.ok(storeFile(file));
    }

    @PostMapping("/multiple")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, String>>> uploadMultipleFiles(
            @RequestParam("images") MultipartFile[] files) {
        if (files.length > 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maximum 10 files per upload");
        }
        List<Map<String, String>> responses = new ArrayList<>();
        for (MultipartFile file : files) {
            responses.add(storeFile(file));
        }
        return ResponseEntity.ok(responses);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Map<String, String> storeFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "File too large. Maximum size is 50MB");
        }

        // Read bytes once — reused for Tika detection and ImageIO decode
        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read file");
        }

        // ── Validate MIME from magic bytes — never trust client Content-Type ─
        String detectedMime = tika.detect(fileBytes);
        if (!ALLOWED_MIME_TYPES.contains(detectedMime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only JPEG, PNG, WebP, and GIF images are allowed");
        }

        // ── Decode image ──────────────────────────────────────────────────────
        BufferedImage img;
        try {
            img = ImageIO.read(new ByteArrayInputStream(fileBytes));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not decode image");
        }
        if (img == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unreadable image format");
        }

        // ── Safe destination — always output JPEG ─────────────────────────────
        String safeFilename = UUID.randomUUID() + ".jpg";
        Path destination = rootLocation.resolve(safeFilename).normalize().toAbsolutePath();
        if (!destination.startsWith(rootLocation)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file path");
        }

        // ── Resize + compress ─────────────────────────────────────────────────
        // Downscale only: images smaller than MAX_DIMENSION are kept at original size.
        try {
            int w = img.getWidth();
            int h = img.getHeight();
            var builder = Thumbnails.of(img).outputFormat("jpeg").outputQuality(OUTPUT_QUALITY);
            if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
                builder.size(MAX_DIMENSION, MAX_DIMENSION);
            } else {
                builder.scale(1.0);
            }
            builder.toFile(destination.toFile());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to process image");
        }

        log.info("Image stored ({}x{} → max {}px, q{}): {}", img.getWidth(), img.getHeight(),
                MAX_DIMENSION, OUTPUT_QUALITY, safeFilename);
        return Map.of("imageUrl", "/uploads/" + safeFilename);
    }
}
