import nodemailer from "nodemailer"
import { NextRequest, NextResponse } from "next/server"

interface ForgotPasswordBackendResponse {
  message: string
  reset_token?: string
  expires_in_minutes?: number
}

function getEnv(name: string) {
  const value = process.env[name]
  return typeof value === "string" ? value.trim() : ""
}

function buildResetUrl(request: NextRequest, email: string, token: string) {
  const configuredBaseUrl =
    getEnv("APP_BASE_URL") ||
    getEnv("NEXT_PUBLIC_APP_URL") ||
    request.nextUrl.origin

  const resetUrl = new URL("/reset-password", configuredBaseUrl)
  resetUrl.searchParams.set("email", email)
  resetUrl.searchParams.set("token", token)
  return resetUrl.toString()
}

function buildTransport() {
  const host = getEnv("SMTP_HOST")
  const port = Number(getEnv("SMTP_PORT") || "587")
  const user = getEnv("SMTP_USER")
  const pass = getEnv("SMTP_PASS")

  if (!host || !port || !user || !pass) {
    throw new Error("SMTP configuration is incomplete.")
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: getEnv("SMTP_SECURE") === "true",
    auth: {
      user,
      pass,
    },
  })
}

function buildEmailHtml(resetUrl: string, expiresInMinutes: number) {
  return `
    <div style="background: #f8fafc; padding: 32px 16px;">
      <style>
        @media (prefers-color-scheme: dark) {
          .fm-shell {
            background: #0b0c10 !important;
          }
          .fm-card {
            background: #12141d !important;
            border-color: rgba(255, 255, 255, 0.08) !important;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35) !important;
          }
          .fm-title,
          .fm-body,
          .fm-signoff,
          .fm-brand {
            color: #f9fafb !important;
          }
          .fm-muted {
            color: #9ca3af !important;
          }
          .fm-link {
            color: #67e8f9 !important;
          }
        }
      </style>
      <div class="fm-shell" style="font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; padding: 0;">
      <div class="fm-card" style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid rgba(15,23,42,0.08); border-radius: 20px; padding: 32px; box-shadow: 0 24px 60px rgba(15,23,42,0.08);">
        <h1 class="fm-title" style="margin: 0 0 12px; font-size: 28px; line-height: 1.2; color: #0f172a;">Reset your FounderMind password</h1>
        <p class="fm-muted" style="margin: 0 0 20px; color: #475569; line-height: 1.6;">
          We received a request to reset your password. Use the button below to choose a new one.
        </p>
        <a
          href="${resetUrl}"
          style="display: inline-block; padding: 14px 22px; border-radius: 12px; background: linear-gradient(135deg, #7c3aed, #06b6d4); color: #ffffff; text-decoration: none; font-weight: 700;"
        >
          Reset Password
        </a>
        <p class="fm-body" style="margin: 20px 0 0; color: #0f172a; line-height: 1.6;">
          This reset link expires in <strong>${expiresInMinutes} minutes</strong>.
        </p>
        <p class="fm-muted" style="margin: 20px 0 0; color: #475569; line-height: 1.6;">
          If the button does not work, copy and paste this link into your browser:
        </p>
        <p class="fm-link" style="margin: 8px 0 0; word-break: break-word; color: #0891b2;">
          ${resetUrl}
        </p>
        <p class="fm-muted" style="margin: 20px 0 0; color: #475569; line-height: 1.6;">
          If you did not request this, you can safely ignore this email.
        </p>
        <p class="fm-signoff" style="margin: 28px 0 0; color: #0f172a; line-height: 1.6;">
          Best regards,
        </p>
        <p class="fm-brand" style="margin: 4px 0 0; color: #0f172a; font-weight: 700; line-height: 1.6;">
          FounderMind Team
        </p>
      </div>
      </div>
    </div>
  `
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { email?: string } | null
    const email = body?.email?.trim()

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 })
    }

    const apiBaseUrl = getEnv("NEXT_PUBLIC_API_BASE_URL")
    const mailerKey = getEnv("PASSWORD_RESET_MAILER_KEY")

    if (!apiBaseUrl) {
      return NextResponse.json(
        { error: "Password reset API is not configured." },
        { status: 500 }
      )
    }

    if (!mailerKey) {
      return NextResponse.json(
        { error: "Password reset mailer key is not configured." },
        { status: 500 }
      )
    }

    const backendResponse = await fetch(`${apiBaseUrl}/users/forgot-password/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Password-Reset-Mailer-Key": mailerKey,
      },
      body: JSON.stringify({ email }),
      cache: "no-store",
    })

    const payload =
      ((await backendResponse.json().catch(() => ({}))) as ForgotPasswordBackendResponse & {
        error?: string
      }) || {}

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: payload.error || "Unable to process password reset." },
        { status: backendResponse.status }
      )
    }

    if (payload.reset_token) {
      const resetUrl = buildResetUrl(request, email, payload.reset_token)
      const transporter = buildTransport()
      const mailFrom = getEnv("MAIL_FROM") || getEnv("SMTP_USER")
      const expiresInMinutes = payload.expires_in_minutes || 30

      await transporter.sendMail({
        from: mailFrom,
        to: email,
        subject: "Reset your FounderMind password",
        text: [
          "Reset your FounderMind password.",
          "",
          `Use this link to choose a new password: ${resetUrl}`,
          `This reset link expires in ${expiresInMinutes} minutes.`,
          "",
          "Best regards,",
          "FounderMind Team",
        ].join("\n"),
        html: buildEmailHtml(resetUrl, expiresInMinutes),
      })
    }

    return NextResponse.json({
      message:
        payload.message ||
        "If an account exists for that email, a password reset link has been sent.",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to send password reset email.",
      },
      { status: 500 }
    )
  }
}
