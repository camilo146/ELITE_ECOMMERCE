package com.elite.ecommerce.controller;

import org.apache.tika.Tika;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private static final Logger log = LoggerFactory.getLogger(UploadController.class);

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );
    private static final Map<String, String> MIME_TO_EXTENSION = Map.of(
            "image/jpeg", ".jpg",
            "image/png",  ".png",
            "image/webp", ".webp",
            "image/gif",  ".gif"
    );
    // Límite real configurado en spring.servlet.multipart.max-file-size (50 MB)
    private static final long MAX_FILE_SIZE_BYTES = 50L * 1024 * 1024;

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

    @GetMapping("/{filename:.+}")
    @ResponseBody
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        // ── Path traversal prevention ─────────────────────────────────────
        Path filePath = rootLocation.resolve(filename).normalize().toAbsolutePath();

        if (!filePath.startsWith(rootLocation)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        try {
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
            }

            // Detect actual content type from file contents
            String contentType = tika.detect(filePath.toFile());
            if (!ALLOWED_MIME_TYPES.contains(contentType)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "File type not permitted");
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, contentType)
                    // Inline for images — prevents download dialog
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    // Prevent the browser from executing served content as script
                    .header("X-Content-Type-Options", "nosniff")
                    .header("Content-Security-Policy", "default-src 'none'")
                    .body(resource);

        } catch (MalformedURLException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not read file");
        }
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

        // ── Detect MIME type from magic bytes — not from client Content-Type ─
        String detectedMime;
        try {
            detectedMime = tika.detect(file.getInputStream());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read file");
        }

        if (!ALLOWED_MIME_TYPES.contains(detectedMime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only JPEG, PNG, WebP, and GIF images are allowed");
        }

        // ── Generate safe filename — never use getOriginalFilename() for path ─
        String safeExtension = MIME_TO_EXTENSION.get(detectedMime);
        String safeFilename = UUID.randomUUID().toString() + safeExtension;

        Path destination = rootLocation.resolve(safeFilename).normalize().toAbsolutePath();

        // Final path traversal check
        if (!destination.startsWith(rootLocation)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file path");
        }

        try {
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file");
        }

        log.info("File uploaded: {}", safeFilename);
        return Map.of("imageUrl", "/uploads/" + safeFilename);
    }
}
