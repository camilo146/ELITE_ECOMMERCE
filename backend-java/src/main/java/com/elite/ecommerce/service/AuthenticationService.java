package com.elite.ecommerce.service;

import com.elite.ecommerce.dto.AuthenticationRequest;
import com.elite.ecommerce.dto.AuthenticationResponse;
import com.elite.ecommerce.dto.RegisterRequest;
import com.elite.ecommerce.model.AuditEventType;
import com.elite.ecommerce.model.Role;
import com.elite.ecommerce.model.User;
import com.elite.ecommerce.repository.UserRepository;
import com.elite.ecommerce.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.FORBIDDEN;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private static final Logger log = LoggerFactory.getLogger(AuthenticationService.class);

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailVerificationService emailVerificationService;
    private final AuditLogService auditLogService;
    private final EmailService emailService;

    @Value("${app.email-verification.required:true}")
    private boolean emailVerificationRequired;

    @Transactional
    public AuthenticationResponse register(RegisterRequest request, String ip, String ua) {
        // Vague message — don't reveal whether the email or username already exists
        if (repository.existsByEmail(request.getEmail()) ||
            repository.existsByUsername(request.getUsername())) {
            // Still log for abuse detection — a real attacker will see the vague message
            log.warn("Register attempt for existing email/username from ip={}", ip);
            // 409 Conflict — no 500. El GlobalExceptionHandler lo devuelve correctamente.
            throw new ResponseStatusException(CONFLICT, "El email o nombre de usuario ya está registrado.");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(Role.USER)
                .emailVerified(!emailVerificationRequired) // verified immediately if verification disabled
                .build();

        repository.save(user);

        if (emailVerificationRequired) {
            // Verificación activa: envía link de verificación (incluye bienvenida implícita)
            emailVerificationService.sendVerificationEmail(user);
        } else {
            // Verificación desactivada (dev): envía email de bienvenida directamente
            emailService.sendWelcome(user);
        }

        auditLogService.log(AuditEventType.REGISTER, user.getId(), user.getUsername(), ip, ua);

        // Don't issue an access token yet if email verification is required
        if (emailVerificationRequired) {
            return AuthenticationResponse.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .role(user.getRole().name())
                    .emailVerificationRequired(true)
                    .build();
        }

        String jwtToken = jwtService.generateToken(user);
        return AuthenticationResponse.builder()
                .id(user.getId())
                .token(jwtToken)
                .username(user.getUsername())
                .role(user.getRole().name())
                .build();
    }

    @Transactional
    public AuthenticationResponse authenticate(AuthenticationRequest request, String ip, String ua) {
        User user = repository.findByEmail(request.getEmail())
                .or(() -> repository.findByUsername(request.getEmail()))
                .orElseThrow(() -> {
                    auditLogService.log(AuditEventType.LOGIN_FAILURE, null, request.getEmail(), ip, ua);
                    return new BadCredentialsException("Invalid credentials");
                });

        if (!user.isAccountNonLocked()) {
            auditLogService.log(AuditEventType.LOGIN_LOCKED, user.getId(), user.getUsername(), ip, ua);
            throw new LockedException("Account is temporarily locked. Try again in 15 minutes.");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        } catch (AuthenticationException e) {
            user.incrementFailedAttempts();
            repository.save(user);
            auditLogService.log(AuditEventType.LOGIN_FAILURE, user.getId(), user.getUsername(), ip, ua);

            if (!user.isAccountNonLocked()) {
                auditLogService.log(AuditEventType.LOGIN_LOCKED, user.getId(), user.getUsername(), ip, ua);
                throw new LockedException("Account locked after too many failed attempts. Try again in 15 minutes.");
            }
            throw new BadCredentialsException("Invalid credentials");
        }

        // Check email verification AFTER successful password check
        if (emailVerificationRequired && !user.isEmailVerified()) {
            log.debug("Login blocked — email not verified for user id={}", user.getId());
            throw new ResponseStatusException(FORBIDDEN,
                    "Please verify your email address before logging in.");
        }

        if (user.getFailedLoginAttempts() > 0) {
            user.resetFailedAttempts();
            repository.save(user);
        }

        auditLogService.log(AuditEventType.LOGIN_SUCCESS, user.getId(), user.getUsername(), ip, ua);

        String jwtToken = jwtService.generateToken(user);
        return AuthenticationResponse.builder()
                .id(user.getId())
                .token(jwtToken)
                .username(user.getUsername())
                .role(user.getRole().name())
                .build();
    }
}
