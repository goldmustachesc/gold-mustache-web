import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockIsFeatureEnabled } = vi.hoisted(() => ({
  mockIsFeatureEnabled: vi.fn(),
}));

vi.mock("../feature-flags", () => ({
  isFeatureEnabled: mockIsFeatureEnabled,
}));

import {
  buildAppointmentConfirmationEmailContent,
  buildAppointmentCancellationEmailContent,
  buildAppointmentReminderEmailContent,
  sendTransactionalEmail,
} from "../transactional-email";

describe("services/transactional-email", () => {
  const originalEnv = { ...process.env };
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    delete process.env.EMAIL_REPLY_TO;
    mockIsFeatureEnabled.mockResolvedValue(true);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("buildAppointmentReminderEmailContent gera subject e conteúdo", () => {
    const content = buildAppointmentReminderEmailContent({
      recipientName: "João",
      serviceName: "Corte",
      barberName: "Carlos",
      date: "22/04/2026",
      time: "10:30",
      manageUrl: "https://example.com/meus-agendamentos",
    });

    expect(content.subject).toContain("10:30");
    expect(content.text).toContain("João");
    expect(content.text).toContain("Corte");
    expect(content.html).toContain("Carlos");
    expect(content.html).toContain("https://example.com/meus-agendamentos");
  });

  it("escapa HTML nos templates de confirmação e cancelamento", () => {
    const confirmation = buildAppointmentConfirmationEmailContent({
      recipientName: "João <script>",
      serviceName: "Corte & Barba",
      barberName: "Carlos >",
      date: "22/04/2026",
      time: "10:30",
      manageUrl: "https://example.com/meus-agendamentos?x=1&y=2",
    });

    expect(confirmation.html).toContain("João &lt;script&gt;");
    expect(confirmation.html).toContain("Corte &amp; Barba");
    expect(confirmation.html).toContain("Carlos &gt;");
    expect(confirmation.html).toContain("x=1&amp;y=2");

    const cancellation = buildAppointmentCancellationEmailContent({
      recipientName: "Maria & Ana",
      serviceName: "Corte <Especial>",
      barberName: "Pedro",
      date: "22/04/2026",
      time: "10:30",
      reason: "Mudança > imprevisto",
      bookUrl: "https://example.com/agendar?promo=a&b=2",
    });

    expect(cancellation.html).toContain("Maria &amp; Ana");
    expect(cancellation.html).toContain("Corte &lt;Especial&gt;");
    expect(cancellation.html).toContain("Mudança &gt; imprevisto");
    expect(cancellation.html).toContain("promo=a&amp;b=2");
  });

  it("retorna skipped quando flag transactionalEmails está desabilitada", async () => {
    mockIsFeatureEnabled.mockResolvedValue(false);

    const result = await sendTransactionalEmail({
      toEmail: "cliente@gold.com",
      template: "appointment-reminder",
      content: {
        subject: "Teste",
        html: "<p>ok</p>",
        text: "ok",
      },
    });

    expect(result).toEqual({
      status: "skipped",
      reason: "feature_disabled",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retorna skipped quando provider não está configurado", async () => {
    const result = await sendTransactionalEmail({
      toEmail: "cliente@gold.com",
      template: "appointment-reminder",
      content: {
        subject: "Teste",
        html: "<p>ok</p>",
        text: "ok",
      },
    });

    expect(result).toEqual({
      status: "skipped",
      reason: "provider_not_configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retorna skipped quando destinatário é inválido", async () => {
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.EMAIL_FROM = "Gold <no-reply@gold.com>";

    const result = await sendTransactionalEmail({
      toEmail: "destinatario-invalido",
      template: "appointment-reminder",
      content: {
        subject: "Teste",
        html: "<p>ok</p>",
        text: "ok",
      },
    });

    expect(result).toEqual({
      status: "skipped",
      reason: "invalid_recipient",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envia email com sucesso e retorna id do provider", async () => {
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.EMAIL_FROM = "Gold <no-reply@gold.com>";
    process.env.EMAIL_REPLY_TO = "suporte@gold.com";

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "resend-123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await sendTransactionalEmail({
      toEmail: "cliente@gold.com",
      template: "appointment-reminder",
      idempotencyKey: "appointment-reminder:apt-1:24h",
      content: {
        subject: "Teste",
        html: "<p>ok</p>",
        text: "ok",
      },
    });

    expect(result).toEqual({
      status: "sent",
      providerMessageId: "resend-123",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-api-key",
        "Content-Type": "application/json",
        "Idempotency-Key": "appointment-reminder:apt-1:24h",
      },
      body: JSON.stringify({
        from: "Gold <no-reply@gold.com>",
        to: ["cliente@gold.com"],
        subject: "Teste",
        html: "<p>ok</p>",
        text: "ok",
        reply_to: "suporte@gold.com",
      }),
    });
  });

  it("retorna failed quando provider responde erro", async () => {
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.EMAIL_FROM = "Gold <no-reply@gold.com>";
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
      }),
    );

    const result = await sendTransactionalEmail({
      toEmail: "cliente@gold.com",
      template: "appointment-reminder",
      content: {
        subject: "Teste",
        html: "<p>ok</p>",
        text: "ok",
      },
    });

    expect(result).toEqual({
      status: "failed",
      reason: "provider_error",
      providerStatus: 429,
    });
  });

  it("retorna failed quando ocorre erro de rede", async () => {
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.EMAIL_FROM = "Gold <no-reply@gold.com>";
    fetchMock.mockRejectedValue(new Error("network down"));

    const result = await sendTransactionalEmail({
      toEmail: "cliente@gold.com",
      template: "appointment-reminder",
      content: {
        subject: "Teste",
        html: "<p>ok</p>",
        text: "ok",
      },
    });

    expect(result).toEqual({
      status: "failed",
      reason: "network_error",
    });
  });
});
