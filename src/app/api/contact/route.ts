import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Validate input to prevent injection attacks
function sanitize(str: unknown): string {
  if (typeof str !== "string") return "";
  return str.replace(/[<>]/g, "").substring(0, 500).trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const nom = sanitize(body.nom);
    const email = sanitize(body.email);
    const magasin = sanitize(body.magasin);
    const tel = sanitize(body.tel);
    const offreAmbassadeur = body.offreAmbassadeur === true;

    // Basic validation
    if (!nom || !email || !magasin) {
      return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
    }
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
    }

    const smtpUser = process.env.CONTACT_SMTP_USER;
    const smtpPass = process.env.CONTACT_SMTP_PASS;
    const smtpHost = process.env.CONTACT_SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.CONTACT_SMTP_PORT || "587", 10);
    const emailTo = process.env.CONTACT_EMAIL_TO || smtpUser;

    if (!smtpUser || !smtpPass || !emailTo) {
      console.error("[/api/contact] CONTACT_SMTP_USER / CONTACT_SMTP_PASS / CONTACT_EMAIL_TO non configurés");
      return NextResponse.json(
        { error: "Service email non configuré. Contactez-nous à sgdigitalweb13@gmail.com" },
        { status: 503 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"OptiPilot Contact" <${smtpUser}>`,
      to: emailTo,
      replyTo: email,
      subject: offreAmbassadeur
        ? `🔥 OFFRE AMBASSADEUR — Réservation de ${magasin}`
        : `Demande de démo OptiPilot — ${magasin}`,
      text: [
        `Nom : ${nom}`,
        `Email : ${email}`,
        `Magasin : ${magasin}`,
        `Téléphone : ${tel || "Non renseigné"}`,
        offreAmbassadeur ? `\nOFFRE : Ambassadeur 199€/mois à vie` : "",
        "",
        offreAmbassadeur
          ? "Demande de réservation pour l'OFFRE AMBASSADEUR (199€/mois à vie)."
          : "Demande reçue via le formulaire de la landing page OptiPilot.",
      ].join("\n"),
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#07021a;color:#DDDAF5;border-radius:16px;">
          ${offreAmbassadeur ? `<div style="background:linear-gradient(90deg,#ec4899,#f472b6);padding:12px 20px;border-radius:10px;margin-bottom:20px;"><strong style="color:#fff;font-size:16px">🔥 Réservation Offre Ambassadeur — 199€/mois à vie</strong></div>` : ""}
          <h2 style="color:#a78bfa;margin-top:0;">${offreAmbassadeur ? "Nouvelle réservation Ambassadeur" : "Nouvelle demande de démo OptiPilot"}</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#9B96DA;width:120px;">Nom</td><td style="padding:8px 0;color:#fff;font-weight:600;">${nom}</td></tr>
            <tr><td style="padding:8px 0;color:#9B96DA;">Email</td><td style="padding:8px 0;color:#fff;font-weight:600;"><a href="mailto:${email}" style="color:#a78bfa;">${email}</a></td></tr>
            <tr><td style="padding:8px 0;color:#9B96DA;">Magasin</td><td style="padding:8px 0;color:#fff;font-weight:600;">${magasin}</td></tr>
            <tr><td style="padding:8px 0;color:#9B96DA;">Téléphone</td><td style="padding:8px 0;color:#fff;font-weight:600;">${tel || "—"}</td></tr>
            ${offreAmbassadeur ? `<tr><td style="padding:8px 0;color:#9B96DA;">Offre</td><td style="padding:8px 0;color:#f472b6;font-weight:700;">Ambassadeur 199€/mois à vie</td></tr>` : ""}
          </table>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/contact] Erreur d'envoi:", err);
    return NextResponse.json({ error: "Erreur lors de l'envoi. Réessayez ou contactez-nous directement." }, { status: 500 });
  }
}
