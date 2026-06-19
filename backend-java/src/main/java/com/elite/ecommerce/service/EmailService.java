package com.elite.ecommerce.service;

import com.elite.ecommerce.model.Order;
import com.elite.ecommerce.model.OrderItem;
import com.elite.ecommerce.model.OrderStatus;
import com.elite.ecommerce.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Servicio de emails via Resend HTTP API (puerto 443 — no SMTP).
 * DigitalOcean bloquea puertos SMTP salientes (25, 465, 587).
 * Usamos la API REST de Resend que funciona sobre HTTPS.
 *
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final RestClient resendClient = RestClient.builder()
            .baseUrl("https://api.resend.com")
            .build();

    // La API key de Resend — viene de RESEND_API_KEY en el .env
    @Value("${spring.mail.password:}")
    private String resendApiKey;

    @Value("${app.mail.from:onboarding@resend.dev}")
    private String fromAddress;

    @Value("${app.mail.from-name:ELITE}")
    private String fromName;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.backend.url:http://localhost:8080}")
    private String backendUrl;

    private static final NumberFormat COP = NumberFormat.getNumberInstance(new Locale("es", "CO"));
    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy 'a las' HH:mm");

    // ── Emails de autenticación ───────────────────────────────────────────────

    @Async
    public void sendWelcome(User user) {
        send(user.getEmail(), "Bienvenido a ELITE", buildWelcomeHtml(user.getUsername()));
    }

    @Async
    public void sendEmailVerification(String toEmail, String username, String rawToken) {
        String url = backendUrl + "/api/auth/verify-email?token=" + rawToken;
        send(toEmail, "Verifica tu cuenta ELITE", buildVerificationHtml(username, url));
    }

    @Async
    public void sendPasswordReset(String toEmail, String username, String rawToken) {
        String url = frontendUrl + "/reset-password?token=" + rawToken;
        send(toEmail, "Restablecer contraseña — ELITE", buildPasswordResetHtml(username, url));
    }

    // ── Emails de pedidos ─────────────────────────────────────────────────────

    @Async
    public void sendOrderCreated(Order order) {
        send(order.getUser().getEmail(),
                "Pedido #" + order.getId() + " recibido — ELITE",
                buildOrderCreatedHtml(customerName(order), order));
    }

    @Async
    public void sendPaymentConfirmed(Order order) {
        send(order.getUser().getEmail(),
                "Pago confirmado — Pedido #" + order.getId(),
                buildPaymentConfirmedHtml(customerName(order), order));
    }

    @Async
    public void sendOrderStatusChanged(Order order) {
        OrderStatus status = order.getOrderStatus();
        if (status == OrderStatus.PENDING_PAYMENT) return;

        String subject = switch (status) {
            case PROCESSING -> "Tu pedido está siendo preparado — #" + order.getId();
            case SHIPPED    -> "Tu pedido está en camino — #" + order.getId();
            case DELIVERED  -> "Pedido entregado — #" + order.getId();
            case CANCELLED  -> "Pedido cancelado — #" + order.getId();
            default         -> "Actualización de pedido — #" + order.getId();
        };

        send(order.getUser().getEmail(), subject,
                buildOrderStatusHtml(customerName(order), order, status));
    }

    // ── Envío via Resend HTTP API ─────────────────────────────────────────────

    private void send(String to, String subject, String html) {
        if (resendApiKey == null || resendApiKey.isBlank()
                || resendApiKey.startsWith("RE_placeholder")
                || resendApiKey.startsWith("re_REEMPLAZA")) {
            log.warn("RESEND_API_KEY no configurada — email omitido: '{}'", subject);
            return;
        }

        try {
            Map<String, Object> payload = Map.of(
                    "from",    fromName + " <" + fromAddress + ">",
                    "to",      List.of(to),
                    "subject", subject,
                    "html",    html
            );

            resendClient.post()
                    .uri("/emails")
                    .header("Authorization", "Bearer " + resendApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

            log.info("Email enviado via Resend API: '{}' → {}", subject, maskEmail(to));

        } catch (Exception e) {
            log.error("Error al enviar email '{}' to '{}': {}", subject, maskEmail(to), e.getMessage());
        }
    }

    // ── Plantillas HTML ───────────────────────────────────────────────────────

    private String buildWelcomeHtml(String username) {
        return layout("Bienvenido a ELITE", """
            <h1 style="color:#fff;font-size:22px;font-weight:300;margin:0 0 16px;">Bienvenido, %s</h1>
            <p style="color:#999;font-size:14px;line-height:1.8;margin:0 0 24px;">
              Tu cuenta en <strong style="color:#fff;">ELITE</strong> ha sido creada exitosamente.<br>
              Explora nuestra colección de moda urbana y encuentra tu estilo.
            </p>
            <a href="%s/products" style="%s">Ver Colección</a>
            <p style="color:#555;font-size:11px;margin:28px 0 0;">Si no creaste esta cuenta, ignora este mensaje.</p>
        """.formatted(username, frontendUrl, btnStyle()));
    }

    private String buildVerificationHtml(String username, String url) {
        return layout("Verifica tu cuenta", """
            <h1 style="color:#fff;font-size:22px;font-weight:300;margin:0 0 16px;">Verifica tu correo</h1>
            <p style="color:#999;font-size:14px;line-height:1.8;margin:0 0 24px;">
              Hola <strong style="color:#ddd;">%s</strong>,<br>
              Haz clic en el botón para activar tu cuenta ELITE.
            </p>
            <a href="%s" style="%s">Verificar Correo</a>
            <p style="color:#555;font-size:11px;margin:28px 0 0;line-height:1.6;">
              Este enlace expira en 24 horas.<br>Si no solicitaste esto, ignora este mensaje.
            </p>
        """.formatted(username, url, btnStyle()));
    }

    private String buildPasswordResetHtml(String username, String url) {
        return layout("Restablecer contraseña", """
            <h1 style="color:#fff;font-size:22px;font-weight:300;margin:0 0 16px;">Restablecer contraseña</h1>
            <p style="color:#999;font-size:14px;line-height:1.8;margin:0 0 24px;">
              Hola <strong style="color:#ddd;">%s</strong>,<br>
              Recibimos una solicitud para restablecer tu contraseña.
            </p>
            <a href="%s" style="%s">Restablecer Contraseña</a>
            <p style="color:#555;font-size:11px;margin:28px 0 0;line-height:1.6;">
              Este enlace expira en 1 hora.<br>Si no lo solicitaste, tu contraseña no cambiará.
            </p>
        """.formatted(username, url, btnStyle()));
    }

    private String buildOrderCreatedHtml(String name, Order order) {
        String method = "mercadopago".equalsIgnoreCase(order.getPaymentMethod())
                ? "Mercado Pago" : "Pago Contra Entrega";
        return layout("Pedido recibido", """
            <h1 style="color:#fff;font-size:22px;font-weight:300;margin:0 0 8px;">Pedido #%d recibido</h1>
            <p style="color:#999;font-size:13px;margin:0 0 28px;">%s</p>
            <p style="color:#bbb;font-size:14px;line-height:1.8;margin:0 0 24px;">
              Hola <strong style="color:#fff;">%s</strong>,<br>hemos recibido tu pedido.
            </p>
            %s
            <div style="margin:20px 0;padding:16px;background:#1a1a1a;border:1px solid #2a2a2a;">
              <p style="margin:0;color:#777;font-size:10px;text-transform:uppercase;">Método de pago</p>
              <p style="margin:4px 0 0;color:#fff;font-size:13px;">%s</p>
            </div>
            <a href="%s/orders" style="%s">Ver Mis Pedidos</a>
        """.formatted(order.getId(),
                order.getCreatedAt() != null ? order.getCreatedAt().format(DATE_FMT) : "",
                name, buildItemsTable(order), method, frontendUrl, btnStyle()));
    }

    private String buildPaymentConfirmedHtml(String name, Order order) {
        return layout("Pago confirmado", """
            <h1 style="color:#fff;font-size:22px;font-weight:300;margin:0 0 8px;text-align:center;">Pago aprobado ✓</h1>
            <p style="color:#999;font-size:13px;text-align:center;margin:0 0 28px;">Pedido #%d</p>
            <p style="color:#bbb;font-size:14px;line-height:1.8;margin:0 0 24px;">
              Hola <strong style="color:#fff;">%s</strong>,<br>tu pago fue procesado exitosamente.
            </p>
            %s
            <div style="margin:20px 0;padding:16px;background:#0d2010;border:1px solid #1a4020;">
              <p style="margin:0;color:#4ade80;font-size:12px;text-transform:uppercase;">Total pagado</p>
              <p style="margin:4px 0 0;color:#fff;font-size:20px;font-weight:600;">$ %s COP</p>
            </div>
            <a href="%s/orders" style="%s">Ver Estado del Pedido</a>
        """.formatted(order.getId(), name, buildItemsTable(order),
                formatCOP(order.getTotalAmount()), frontendUrl, btnStyle()));
    }

    private String buildOrderStatusHtml(String name, Order order, OrderStatus status) {
        record Info(String title, String msg, String color, String bg, String icon) {}
        Info info = switch (status) {
            case PROCESSING -> new Info("Preparando tu pedido",
                    "Tu pedido está siendo preparado con cuidado.", "#facc15", "#1a1500", "⟳");
            case SHIPPED    -> new Info("Tu pedido está en camino",
                    "Tu pedido fue despachado. Pronto llegará.", "#60a5fa", "#001020", "→");
            case DELIVERED  -> new Info("Pedido entregado",
                    "Tu pedido fue entregado. ¡Disfrútalo!", "#4ade80", "#0d2010", "✓");
            case CANCELLED  -> new Info("Pedido cancelado",
                    "Tu pedido fue cancelado. Si tienes dudas, contáctanos.", "#f87171", "#2a0f0f", "×");
            default         -> new Info("Actualización de pedido",
                    "El estado de tu pedido ha sido actualizado.", "#fff", "#1a1a1a", "·");
        };

        return layout(info.title(), """
            <h1 style="color:%s;font-size:22px;font-weight:300;margin:0 0 8px;text-align:center;">%s %s</h1>
            <p style="color:#999;font-size:13px;text-align:center;margin:0 0 28px;">Pedido #%d</p>
            <p style="color:#bbb;font-size:14px;line-height:1.8;margin:0 0 24px;">
              Hola <strong style="color:#fff;">%s</strong>,<br>%s
            </p>
            %s
            <a href="%s/orders" style="%s">Ver Mis Pedidos</a>
        """.formatted(info.color(), info.icon(), info.title(),
                order.getId(), name, info.msg(),
                buildItemsTable(order), frontendUrl, btnStyle()));
    }

    private String buildItemsTable(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) return "";
        StringBuilder rows = new StringBuilder();
        for (OrderItem item : order.getItems()) {
            String name = item.getProduct() != null ? item.getProduct().getName() : "Producto";
            String detail = (item.getSize() != null ? " · Talla " + item.getSize() : "")
                          + (item.getColor() != null ? " · " + item.getColor() : "");
            rows.append("""
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#ccc;font-size:13px;">
                    %s<span style="color:#555;font-size:11px;">%s</span> ×%d
                  </td>
                  <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:13px;text-align:right;">
                    $ %s
                  </td>
                </tr>
            """.formatted(name, detail, item.getQuantity(),
                    formatCOP(item.getPrice() * item.getQuantity())));
        }
        return """
            <table style="width:100%%;border-collapse:collapse;margin:16px 0;">
              <tbody>%s</tbody>
              <tfoot><tr>
                <td style="padding:12px 0;color:#999;font-size:12px;text-transform:uppercase;">Total</td>
                <td style="padding:12px 0;color:#fff;font-size:16px;font-weight:600;text-align:right;">$ %s COP</td>
              </tr></tfoot>
            </table>
        """.formatted(rows, formatCOP(order.getTotalAmount()));
    }

    private String layout(String title, String content) {
        return """
            <!DOCTYPE html><html lang="es">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
            <title>%s — ELITE</title></head>
            <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0"
                    style="background:#111;border:1px solid #222;max-width:560px;width:100%%;">
                    <tr><td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid #1e1e1e;">
                      <span style="font-size:18px;font-weight:300;letter-spacing:0.45em;color:#fff;text-transform:uppercase;">ELITE</span>
                    </td></tr>
                    <tr><td style="padding:40px;">%s</td></tr>
                    <tr><td style="padding:20px 40px;border-top:1px solid #1e1e1e;text-align:center;">
                      <p style="margin:0;color:#444;font-size:11px;">
                        ELITE — Moda Urbana<br>
                        <a href="%s" style="color:#555;text-decoration:none;">%s</a>
                      </p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body></html>
        """.formatted(title, content,
                frontendUrl, frontendUrl.replace("https://", "").replace("http://", ""));
    }

    private String btnStyle() {
        return "display:inline-block;padding:13px 28px;background:#fff;color:#000;" +
               "text-decoration:none;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;margin:8px 0;";
    }

    private String formatCOP(double amount) {
        return COP.format((long) amount);
    }

    private String customerName(Order order) {
        if (order.getShippingAddress() != null
                && order.getShippingAddress().getFullName() != null
                && !order.getShippingAddress().getFullName().isBlank()) {
            return order.getShippingAddress().getFullName().split(" ")[0];
        }
        return order.getUser().getUsername();
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] p = email.split("@");
        return (p[0].length() > 2 ? p[0].substring(0, 2) : p[0]) + "***@" + p[1];
    }
}
