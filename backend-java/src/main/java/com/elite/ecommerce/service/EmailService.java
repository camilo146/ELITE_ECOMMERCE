package com.elite.ecommerce.service;

import com.elite.ecommerce.model.Order;
import com.elite.ecommerce.model.OrderItem;
import com.elite.ecommerce.model.OrderStatus;
import com.elite.ecommerce.model.User;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Servicio central de emails transaccionales via Resend SMTP.
 * Todos los envíos son asíncronos — un fallo de email nunca interrumpe la lógica de negocio.
 */
@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:onboarding@resend.dev}")
    private String fromAddress;

    @Value("${app.mail.from-name:ÉLITE}")
    private String fromName;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    private static final NumberFormat COP = NumberFormat.getNumberInstance(new Locale("es", "CO"));
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy 'a las' HH:mm");

    // ── Emails de autenticación ───────────────────────────────────────────────

    /** Bienvenida al nuevo usuario (sin verificación de email, perfil dev) */
    @Async
    public void sendWelcome(User user) {
        send(
            user.getEmail(),
            "Bienvenido a ÉLITE",
            buildWelcomeHtml(user.getUsername())
        );
    }

    /** Verificación de correo electrónico */
    @Async
    public void sendEmailVerification(String toEmail, String username, String rawToken) {
        String url = frontendUrl + "/email-verified?token=" + rawToken;
        send(
            toEmail,
            "Verifica tu cuenta ÉLITE",
            buildVerificationHtml(username, url)
        );
    }

    /** Restablecimiento de contraseña */
    @Async
    public void sendPasswordReset(String toEmail, String username, String rawToken) {
        String url = frontendUrl + "/reset-password?token=" + rawToken;
        send(
            toEmail,
            "Restablecer contraseña — ÉLITE",
            buildPasswordResetHtml(username, url)
        );
    }

    // ── Emails de pedidos ─────────────────────────────────────────────────────

    /** Confirmación de pedido creado */
    @Async
    public void sendOrderCreated(Order order) {
        String name = customerName(order);
        send(
            order.getUser().getEmail(),
            "Pedido #" + order.getId() + " recibido — ÉLITE",
            buildOrderCreatedHtml(name, order)
        );
    }

    /** Pago aprobado por MercadoPago */
    @Async
    public void sendPaymentConfirmed(Order order) {
        String name = customerName(order);
        send(
            order.getUser().getEmail(),
            "Pago confirmado — Pedido #" + order.getId(),
            buildPaymentConfirmedHtml(name, order)
        );
    }

    /** Cambio de estado del pedido (admin lo actualiza) */
    @Async
    public void sendOrderStatusChanged(Order order) {
        OrderStatus status = order.getOrderStatus();

        // Solo enviar para estados relevantes para el cliente
        if (status == OrderStatus.PENDING_PAYMENT) return;

        String subject = switch (status) {
            case PROCESSING -> "Tu pedido está siendo preparado — #" + order.getId();
            case SHIPPED    -> "Tu pedido está en camino — #" + order.getId();
            case DELIVERED  -> "Pedido entregado — #" + order.getId();
            case CANCELLED  -> "Pedido cancelado — #" + order.getId();
            default         -> "Actualización de pedido — #" + order.getId();
        };

        send(
            order.getUser().getEmail(),
            subject,
            buildOrderStatusHtml(customerName(order), order, status)
        );
    }

    // ── Envío interno ─────────────────────────────────────────────────────────

    private void send(String to, String subject, String html) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(new InternetAddress(fromAddress, fromName));
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(msg);
            log.info("Email enviado: subject='{}' to='{}'", subject, maskEmail(to));
        } catch (Exception e) {
            log.error("Error enviando email '{}' to '{}': {}", subject, maskEmail(to), e.getMessage());
        }
    }

    // ── Plantillas HTML ───────────────────────────────────────────────────────

    private String buildWelcomeHtml(String username) {
        return layout("Bienvenido a ÉLITE", """
            <h1 style="color:#fff;font-size:22px;font-weight:300;margin:0 0 16px;letter-spacing:0.05em;">
              Bienvenido, %s
            </h1>
            <p style="color:#999;font-size:14px;line-height:1.8;margin:0 0 24px;">
              Tu cuenta en <strong style="color:#fff;">ÉLITE</strong> ha sido creada exitosamente.<br>
              Explora nuestra colección de moda urbana y encuentra tu estilo.
            </p>
            <a href="%s/products" style="%s">Ver Colección</a>
            <p style="color:#555;font-size:11px;margin:28px 0 0;">
              Si no creaste esta cuenta, ignora este mensaje.
            </p>
        """.formatted(username, frontendUrl, btnStyle()));
    }

    private String buildVerificationHtml(String username, String url) {
        return layout("Verifica tu cuenta", """
            <h1 style="color:#fff;font-size:22px;font-weight:300;margin:0 0 16px;">
              Verifica tu correo
            </h1>
            <p style="color:#999;font-size:14px;line-height:1.8;margin:0 0 24px;">
              Hola <strong style="color:#ddd;">%s</strong>,<br>
              Haz clic en el botón para activar tu cuenta ÉLITE.
            </p>
            <a href="%s" style="%s">Verificar Correo</a>
            <p style="color:#555;font-size:11px;margin:28px 0 0;line-height:1.6;">
              Este enlace expira en 24 horas.<br>
              Si no solicitaste esto, ignora este mensaje.
            </p>
        """.formatted(username, url, btnStyle()));
    }

    private String buildPasswordResetHtml(String username, String url) {
        return layout("Restablecer contraseña", """
            <h1 style="color:#fff;font-size:22px;font-weight:300;margin:0 0 16px;">
              Restablecer contraseña
            </h1>
            <p style="color:#999;font-size:14px;line-height:1.8;margin:0 0 24px;">
              Hola <strong style="color:#ddd;">%s</strong>,<br>
              Recibimos una solicitud para restablecer tu contraseña.
            </p>
            <a href="%s" style="%s">Restablecer Contraseña</a>
            <p style="color:#555;font-size:11px;margin:28px 0 0;line-height:1.6;">
              Este enlace expira en 1 hora.<br>
              Si no lo solicitaste, tu contraseña no cambiará.
            </p>
        """.formatted(username, url, btnStyle()));
    }

    private String buildOrderCreatedHtml(String name, Order order) {
        String paymentMethod = "mercadopago".equalsIgnoreCase(order.getPaymentMethod())
                ? "Mercado Pago" : "Pago Contra Entrega";

        return layout("Pedido recibido", """
            <h1 style="color:#fff;font-size:22px;font-weight:300;margin:0 0 8px;">
              Pedido #%d recibido
            </h1>
            <p style="color:#999;font-size:13px;margin:0 0 28px;">%s</p>

            <p style="color:#bbb;font-size:14px;line-height:1.8;margin:0 0 24px;">
              Hola <strong style="color:#fff;">%s</strong>,<br>
              hemos recibido tu pedido. Te notificaremos cuando esté listo.
            </p>

            %s

            <div style="margin:20px 0;padding:16px;background:#1a1a1a;border:1px solid #2a2a2a;">
              <p style="margin:0;color:#777;font-size:10px;text-transform:uppercase;letter-spacing:0.15em;">Método de pago</p>
              <p style="margin:4px 0 0;color:#fff;font-size:13px;">%s</p>
            </div>

            <a href="%s/orders" style="%s">Ver Mis Pedidos</a>
        """.formatted(
            order.getId(),
            order.getCreatedAt() != null ? order.getCreatedAt().format(DATE_FMT) : "",
            name,
            buildItemsTable(order),
            paymentMethod,
            frontendUrl, btnStyle()
        ));
    }

    private String buildPaymentConfirmedHtml(String name, Order order) {
        return layout("Pago confirmado", """
            <div style="text-align:center;margin-bottom:28px;">
              <div style="display:inline-block;width:48px;height:48px;border:1px solid #2a2a2a;line-height:48px;text-align:center;">
                <span style="color:#4ade80;font-size:22px;">✓</span>
              </div>
            </div>

            <h1 style="color:#fff;font-size:22px;font-weight:300;margin:0 0 8px;text-align:center;">
              Pago aprobado
            </h1>
            <p style="color:#999;font-size:13px;text-align:center;margin:0 0 28px;">Pedido #%d</p>

            <p style="color:#bbb;font-size:14px;line-height:1.8;margin:0 0 24px;">
              Hola <strong style="color:#fff;">%s</strong>,<br>
              tu pago fue procesado exitosamente. Comenzaremos a preparar tu pedido de inmediato.
            </p>

            %s

            <div style="margin:20px 0;padding:16px;background:#0d2010;border:1px solid #1a4020;">
              <p style="margin:0;color:#4ade80;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Total pagado</p>
              <p style="margin:4px 0 0;color:#fff;font-size:20px;font-weight:600;">$ %s COP</p>
            </div>

            <a href="%s/orders" style="%s">Ver Estado del Pedido</a>
        """.formatted(
            order.getId(),
            name,
            buildItemsTable(order),
            formatCOP(order.getTotalAmount()),
            frontendUrl, btnStyle()
        ));
    }

    private String buildOrderStatusHtml(String name, Order order, OrderStatus status) {
        record StatusInfo(String title, String message, String color, String borderColor, String icon) {}

        StatusInfo info = switch (status) {
            case PROCESSING -> new StatusInfo(
                "Preparando tu pedido",
                "Nuestro equipo está preparando tu pedido con cuidado. Te avisaremos cuando sea enviado.",
                "#facc15", "#3a3010", "⟳"
            );
            case SHIPPED -> new StatusInfo(
                "Tu pedido está en camino",
                "Tu pedido ha sido despachado y está en camino. Pronto estará en tus manos.",
                "#60a5fa", "#101830", "→"
            );
            case DELIVERED -> new StatusInfo(
                "Pedido entregado",
                "Tu pedido ha sido entregado. Esperamos que disfrutes tu compra.",
                "#4ade80", "#0d2010", "✓"
            );
            case CANCELLED -> new StatusInfo(
                "Pedido cancelado",
                "Tu pedido ha sido cancelado. Si tienes dudas, contáctanos.",
                "#f87171", "#2a1010", "×"
            );
            default -> new StatusInfo(
                "Actualización de pedido",
                "El estado de tu pedido ha sido actualizado.",
                "#fff", "#222", "·"
            );
        };

        return layout(info.title(), """
            <div style="text-align:center;margin-bottom:28px;">
              <div style="display:inline-block;width:48px;height:48px;border:1px solid %s;line-height:48px;text-align:center;">
                <span style="color:%s;font-size:22px;">%s</span>
              </div>
            </div>

            <h1 style="color:#fff;font-size:22px;font-weight:300;margin:0 0 8px;text-align:center;">
              %s
            </h1>
            <p style="color:#999;font-size:13px;text-align:center;margin:0 0 28px;">Pedido #%d</p>

            <p style="color:#bbb;font-size:14px;line-height:1.8;margin:0 0 24px;">
              Hola <strong style="color:#fff;">%s</strong>,<br>
              %s
            </p>

            <div style="margin:20px 0;padding:16px;background:%s;border:1px solid %s;">
              <p style="margin:0;color:#777;font-size:10px;text-transform:uppercase;letter-spacing:0.15em;">Estado actual</p>
              <p style="margin:4px 0 0;color:%s;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">%s</p>
            </div>

            %s

            <a href="%s/orders" style="%s">Ver Mis Pedidos</a>
        """.formatted(
            info.borderColor(), info.color(), info.icon(),
            info.title(),
            order.getId(),
            name, info.message(),
            info.borderColor(), info.borderColor().replace("0d", "1a").replace("10", "20"),
            info.color(), statusLabel(status),
            buildItemsTable(order),
            frontendUrl, btnStyle()
        ));
    }

    // ── Componentes reutilizables ─────────────────────────────────────────────

    private String buildItemsTable(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) return "";

        StringBuilder rows = new StringBuilder();
        for (OrderItem item : order.getItems()) {
            String productName = item.getProduct() != null ? item.getProduct().getName() : "Producto";
            String detail = "";
            if (item.getSize() != null)  detail += " · Talla " + item.getSize();
            if (item.getColor() != null) detail += " · " + item.getColor();

            rows.append("""
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#ccc;font-size:13px;">
                    %s<span style="color:#555;font-size:11px;"> %s</span>
                    <span style="color:#666;"> ×%d</span>
                  </td>
                  <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:13px;text-align:right;white-space:nowrap;">
                    $ %s
                  </td>
                </tr>
            """.formatted(
                productName, detail, item.getQuantity(),
                formatCOP(item.getPrice() * item.getQuantity())
            ));
        }

        String total = formatCOP(order.getTotalAmount());

        return """
            <table style="width:100%%;border-collapse:collapse;margin:16px 0;">
              <tbody>%s</tbody>
              <tfoot>
                <tr>
                  <td style="padding:12px 0;color:#999;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Total</td>
                  <td style="padding:12px 0;color:#fff;font-size:16px;font-weight:600;text-align:right;">$ %s COP</td>
                </tr>
              </tfoot>
            </table>
        """.formatted(rows.toString(), total);
    }

    private String layout(String title, String content) {
        return """
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width,initial-scale=1.0">
              <title>%s — ÉLITE</title>
            </head>
            <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;max-width:560px;width:100%%;">

                    <!-- Header -->
                    <tr>
                      <td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid #1e1e1e;">
                        <span style="font-size:18px;font-weight:300;letter-spacing:0.45em;color:#fff;text-transform:uppercase;">ÉLITE</span>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding:40px;">
                        %s
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding:20px 40px;border-top:1px solid #1e1e1e;text-align:center;">
                        <p style="margin:0;color:#444;font-size:11px;line-height:1.6;">
                          ÉLITE — Moda Urbana<br>
                          <a href="%s" style="color:#555;text-decoration:none;">%s</a>
                        </p>
                      </td>
                    </tr>

                  </table>
                </td></tr>
              </table>
            </body>
            </html>
        """.formatted(title, content, frontendUrl, frontendUrl.replace("https://", "").replace("http://", ""));
    }

    private String btnStyle() {
        return "display:inline-block;padding:13px 28px;background:#fff;color:#000;" +
               "text-decoration:none;font-size:11px;font-weight:700;letter-spacing:0.14em;" +
               "text-transform:uppercase;margin:8px 0;";
    }

    private String formatCOP(double amount) {
        return COP.format((long) amount);
    }

    private String customerName(Order order) {
        if (order.getShippingAddress() != null && order.getShippingAddress().getFullName() != null
                && !order.getShippingAddress().getFullName().isBlank()) {
            return order.getShippingAddress().getFullName().split(" ")[0];
        }
        return order.getUser().getUsername();
    }

    private String statusLabel(OrderStatus s) {
        return switch (s) {
            case PROCESSING -> "Preparando";
            case SHIPPED    -> "Enviado";
            case DELIVERED  -> "Entregado";
            case CANCELLED  -> "Cancelado";
            default         -> s.name();
        };
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@");
        String user = parts[0];
        return (user.length() > 2 ? user.substring(0, 2) : user) + "***@" + parts[1];
    }
}
