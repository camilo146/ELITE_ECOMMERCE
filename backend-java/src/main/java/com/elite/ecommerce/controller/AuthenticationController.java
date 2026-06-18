package com.elite.ecommerce.controller;

import com.elite.ecommerce.dto.AuthenticationRequest;
import com.elite.ecommerce.dto.AuthenticationResponse;
import com.elite.ecommerce.dto.RegisterRequest;
import com.elite.ecommerce.dto.UserResponseDTO;
import com.elite.ecommerce.model.AuditEventType;
import com.elite.ecommerce.model.RefreshToken;
import com.elite.ecommerce.model.User;
import com.elite.ecommerce.repository.UserRepository;
import com.elite.ecommerce.security.JwtAuthenticationFilter;
import com.elite.ecommerce.security.JwtService;
import com.elite.ecommerce.security.TokenBlacklistService;
import com.elite.ecommerce.dto.PasswordResetRequest;
import com.elite.ecommerce.service.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthenticationController {

    private static final Logger log = LoggerFactory.getLogger(AuthenticationController.class);

    private final AuthenticationService service;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final TokenBlacklistService blacklistService;
    private final RefreshTokenService refreshTokenService;
    private final EmailVerificationService emailVerificationService;
    private final AuditLogService auditLogService;
    private final PasswordResetService passwordResetService;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    // ── Registration ──────────────────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest req,
            HttpServletResponse resp) {

        AuthenticationResponse authResponse = service.register(request, resolveIp(req), req.getHeader("User-Agent"));

        if (Boolean.TRUE.equals(authResponse.getEmailVerificationRequired())) {
            // Don't issue tokens yet — user must verify email first
            return ResponseEntity.status(HttpStatus.CREATED).body(authResponse);
        }

        issueTokens(resp, authResponse.getToken(), authResponse.getId(),
                req.getHeader("User-Agent"), resolveIp(req));

        return ResponseEntity.status(HttpStatus.CREATED).body(withoutToken(authResponse));
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> login(
            @Valid @RequestBody AuthenticationRequest request,
            HttpServletRequest req,
            HttpServletResponse resp) {

        AuthenticationResponse authResponse = service.authenticate(request, resolveIp(req), req.getHeader("User-Agent"));

        issueTokens(resp, authResponse.getToken(), authResponse.getId(),
                req.getHeader("User-Agent"), resolveIp(req));

        return ResponseEntity.ok(withoutToken(authResponse));
    }

    // ── Logout (current device) ───────────────────────────────────────────────

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest req, HttpServletResponse resp) {
        // 1. Blacklist the access token so it can't be reused until expiry
        String accessToken = extractCookieValue(req, JwtAuthenticationFilter.JWT_COOKIE_NAME);
        if (accessToken != null) {
            try {
                blacklistService.blacklist(
                        jwtService.extractJti(accessToken),
                        jwtService.extractExpiration(accessToken));
            } catch (Exception ignored) {}
        }

        // 2. Revoke the refresh token
        String rawRefreshToken = extractCookieValue(req, RefreshTokenService.REFRESH_COOKIE_NAME);
        if (rawRefreshToken != null) {
            try {
                refreshTokenService.revoke(rawRefreshToken);
            } catch (Exception ignored) {}
        }

        // Log if we have authentication context
        Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            User user = (User) auth.getPrincipal();
            auditLogService.log(AuditEventType.LOGOUT, user.getId(), user.getUsername(),
                    resolveIp(req), req.getHeader("User-Agent"));
        }

        // 3. Clear both cookies
        clearAuthCookies(resp);
        return ResponseEntity.ok().build();
    }

    // ── Logout All Devices ────────────────────────────────────────────────────

    @PostMapping("/logout-all")
    public ResponseEntity<Void> logoutAll(HttpServletRequest req, HttpServletResponse resp,
                                           Authentication authentication) {
        User user = (User) authentication.getPrincipal();

        // Revoke all refresh tokens for this user
        refreshTokenService.revokeAll(user.getId());

        // Blacklist current access token
        String accessToken = extractCookieValue(req, JwtAuthenticationFilter.JWT_COOKIE_NAME);
        if (accessToken != null) {
            try {
                blacklistService.blacklist(
                        jwtService.extractJti(accessToken),
                        jwtService.extractExpiration(accessToken));
            } catch (Exception ignored) {}
        }

        auditLogService.log(AuditEventType.LOGOUT_ALL_DEVICES, user.getId(),
                user.getUsername(), resolveIp(req), req.getHeader("User-Agent"));

        clearAuthCookies(resp);
        return ResponseEntity.ok().build();
    }

    // ── Token Refresh ─────────────────────────────────────────────────────────

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest req, HttpServletResponse resp) {
        String rawRefreshToken = extractCookieValue(req, RefreshTokenService.REFRESH_COOKIE_NAME);
        if (rawRefreshToken == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "No refresh token"));
        }

        try {
            // Rotate: revoke old token, issue new one (OWASP requirement)
            String newRawRefreshToken = refreshTokenService.rotate(
                    rawRefreshToken,
                    req.getHeader("User-Agent"),
                    resolveIp(req));

            // Get user from the new token
            RefreshToken newToken = refreshTokenService.validate(newRawRefreshToken);
            User user = newToken.getUser();

            // Issue new access token
            String newAccessToken = jwtService.generateToken(user);

            setAccessTokenCookie(resp, newAccessToken);
            setRefreshTokenCookie(resp, newRawRefreshToken);

            auditLogService.log(AuditEventType.TOKEN_REFRESHED, user.getId(),
                    user.getUsername(), resolveIp(req), req.getHeader("User-Agent"));

            return ResponseEntity.ok(Map.of(
                    "id", user.getId(),
                    "username", user.getUsername(),
                    "role", user.getRole().name()
            ));

        } catch (Exception e) {
            clearAuthCookies(resp);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Session expired. Please log in again."));
        }
    }

    // ── Email Verification ────────────────────────────────────────────────────

    @GetMapping("/verify-email")
    public ResponseEntity<Void> verifyEmail(@RequestParam String token) {
        try {
            emailVerificationService.verify(token);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .header(HttpHeaders.LOCATION, frontendUrl + "/email-verified?status=success")
                    .build();
        } catch (org.springframework.web.server.ResponseStatusException e) {
            String status = e.getStatusCode().value() == 410 ? "expired" : "error";
            return ResponseEntity.status(HttpStatus.FOUND)
                    .header(HttpHeaders.LOCATION, frontendUrl + "/email-verified?status=" + status)
                    .build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.FOUND)
                    .header(HttpHeaders.LOCATION, frontendUrl + "/email-verified?status=error")
                    .build();
        }
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(
            @RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email != null && !email.isBlank()) {
            emailVerificationService.resendVerification(email);
        }
        // Always return success — prevent email enumeration
        return ResponseEntity.ok(Map.of("message",
                "If that email exists and is unverified, a new link has been sent."));
    }

    // ── Password Reset ────────────────────────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @RequestBody Map<String, String> body,
            HttpServletRequest req) {
        String email = body.get("email");
        if (email != null && !email.isBlank()) {
            passwordResetService.requestReset(email.trim(), resolveIp(req));
        }
        // Always return success — never reveal whether the email exists
        return ResponseEntity.ok(Map.of("message",
                "If that email is registered, a reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody PasswordResetRequest request,
            HttpServletRequest req) {
        passwordResetService.resetPassword(request.getToken(), request.getNewPassword(), resolveIp(req));
        return ResponseEntity.ok(Map.of("message", "Password updated successfully. Please log in."));
    }

    // ── Profile ───────────────────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<UserResponseDTO> getMe(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return ResponseEntity.ok(UserResponseDTO.from(user));
    }

    // ── Session info ─────────────────────────────────────────────────────────

    @GetMapping("/sessions")
    public ResponseEntity<?> getActiveSessions(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(refreshTokenService.getActiveSessions(user.getId())
                .stream()
                .map(t -> Map.of(
                        "id", t.getId(),
                        "deviceInfo", t.getDeviceInfo() != null ? t.getDeviceInfo() : "Unknown device",
                        "ipAddress", t.getIpAddress() != null ? t.getIpAddress() : "Unknown IP",
                        "createdAt", t.getCreatedAt().toString(),
                        "lastUsedAt", t.getLastUsedAt() != null ? t.getLastUsedAt().toString() : "Never"
                ))
                .toList());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void issueTokens(HttpServletResponse resp, String accessToken,
                              Long userId, String ua, String ip) {
        setAccessTokenCookie(resp, accessToken);

        // Issue a refresh token tied to this device/IP
        User user = userRepository.findById(userId).orElseThrow();
        String rawRefreshToken = refreshTokenService.create(user, ua, ip);
        setRefreshTokenCookie(resp, rawRefreshToken);
    }

    private void setAccessTokenCookie(HttpServletResponse resp, String token) {
        boolean secure = !frontendUrl.contains("localhost");
        ResponseCookie cookie = ResponseCookie.from(JwtAuthenticationFilter.JWT_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .maxAge(Duration.ofMillis(jwtService.getExpirationMs()))
                .path("/")
                .build();
        resp.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void setRefreshTokenCookie(HttpServletResponse resp, String rawRefreshToken) {
        boolean secure = !frontendUrl.contains("localhost");
        ResponseCookie cookie = ResponseCookie.from(RefreshTokenService.REFRESH_COOKIE_NAME, rawRefreshToken)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .maxAge(Duration.ofDays(7))
                .path("/api/auth")  // Scoped — only sent to auth endpoints
                .build();
        resp.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearAuthCookies(HttpServletResponse resp) {
        boolean secure = !frontendUrl.contains("localhost");

        ResponseCookie accessCleared = ResponseCookie.from(JwtAuthenticationFilter.JWT_COOKIE_NAME, "")
                .httpOnly(true).secure(secure).sameSite("Strict")
                .maxAge(Duration.ZERO).path("/").build();
        ResponseCookie refreshCleared = ResponseCookie.from(RefreshTokenService.REFRESH_COOKIE_NAME, "")
                .httpOnly(true).secure(secure).sameSite("Strict")
                .maxAge(Duration.ZERO).path("/api/auth").build();

        resp.addHeader(HttpHeaders.SET_COOKIE, accessCleared.toString());
        resp.addHeader(HttpHeaders.SET_COOKIE, refreshCleared.toString());
    }

    private String extractCookieValue(HttpServletRequest req, String name) {
        if (req.getCookies() == null) return null;
        return Arrays.stream(req.getCookies())
                .filter(c -> name.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    private AuthenticationResponse withoutToken(AuthenticationResponse resp) {
        return AuthenticationResponse.builder()
                .id(resp.getId())
                .username(resp.getUsername())
                .role(resp.getRole())
                .build();
    }

    private String resolveIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return req.getRemoteAddr();
    }
}
