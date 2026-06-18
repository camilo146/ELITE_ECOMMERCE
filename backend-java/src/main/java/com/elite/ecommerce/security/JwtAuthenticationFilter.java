package com.elite.ecommerce.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    public static final String JWT_COOKIE_NAME = "jwt";

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final TokenBlacklistService blacklistService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String jwt = extractToken(request);

        if (jwt == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String userEmail = jwtService.extractUsername(jwt);
            String jti = jwtService.extractJti(jwt);

            if (userEmail == null || SecurityContextHolder.getContext().getAuthentication() != null) {
                filterChain.doFilter(request, response);
                return;
            }

            // Check token blacklist (logout / revocation)
            if (blacklistService.isBlacklisted(jti)) {
                log.debug("Rejected blacklisted token jti={}", jti);
                filterChain.doFilter(request, response);
                return;
            }

            UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);

            if (jwtService.isTokenValid(jwt, userDetails)) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }

        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            log.debug("JWT token expired");
        } catch (io.jsonwebtoken.security.SignatureException e) {
            log.warn("Invalid JWT signature from IP={}", request.getRemoteAddr());
        } catch (io.jsonwebtoken.MalformedJwtException | io.jsonwebtoken.UnsupportedJwtException e) {
            log.warn("Malformed JWT token from IP={}", request.getRemoteAddr());
        } catch (UsernameNotFoundException e) {
            log.debug("JWT token for non-existent user");
        } catch (Exception e) {
            log.error("JWT filter unexpected error", e);
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extracts JWT from:
     * 1. Authorization: Bearer <token>  (preferred for API clients)
     * 2. HttpOnly cookie named "jwt"     (preferred for browser clients)
     */
    private String extractToken(HttpServletRequest request) {
        // 1. Authorization header takes precedence
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        // 2. HttpOnly cookie
        if (request.getCookies() != null) {
            return Arrays.stream(request.getCookies())
                    .filter(c -> JWT_COOKIE_NAME.equals(c.getName()))
                    .map(Cookie::getValue)
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }
}
