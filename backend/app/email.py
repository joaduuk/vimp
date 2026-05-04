from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
import os

conf = ConnectionConfig(
    MAIL_USERNAME="admin@virmp.app",
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM="admin@virmp.app",
    MAIL_FROM_NAME="VirMP Platform",
    MAIL_PORT=465,
    MAIL_SERVER="smtp.hostinger.com",
    MAIL_STARTTLS=False,
    MAIL_SSL_TLS=True,
    USE_CREDENTIALS=True,
)

fastmail = FastMail(conf)


# ============ WELCOME EMAIL ============
async def send_welcome_email(email: str, username: str):
    message = MessageSchema(
        subject="Welcome to VirMP! 🗳️",
        recipients=[email],
        body=f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #3B82F6; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">🗳️ Welcome to VirMP</h1>
                <p style="color: #E0F2FE; margin: 5px 0;">Your Virtual Representative Platform</p>
            </div>
            <div style="padding: 30px; background-color: #F9FAFB;">
                <h2>Hi {username}! 👋</h2>
                <p>Thank you for joining VirMP. You are now part of your local constituency community.</p>
                <p>Here is what you can do on VirMP:</p>
                <ul>
                    <li>🗣️ Raise and discuss local issues</li>
                    <li>🗳️ Vote on issues that matter to you</li>
                    <li>🏛️ Participate in Virtual MP elections</li>
                    <li>📢 Make your voice heard</li>
                </ul>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://virmp.app" 
                       style="background-color: #3B82F6; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold;">
                        Go to VirMP
                    </a>
                </div>
                <p style="color: #6B7280; font-size: 14px;">
                    If you have any questions, contact us at admin@virmp.app
                </p>
            </div>
        </body>
        </html>
        """,
        subtype="html"
    )
    await fastmail.send_message(message)


# ============ ELECTION ANNOUNCEMENT EMAIL ============
async def send_election_announcement(
    email: str,
    username: str,
    constituency_name: str,
    election_title: str,
    election_id: int
):
    message = MessageSchema(
        subject=f"🗳️ New Election in {constituency_name}!",
        recipients=[email],
        body=f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #3B82F6; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">🗳️ VirMP Election</h1>
            </div>
            <div style="padding: 30px; background-color: #F9FAFB;">
                <h2>New Election Announced!</h2>
                <p>Hi {username},</p>
                <p>A new election has been announced in <strong>{constituency_name}</strong>:</p>
                <div style="background-color: white; padding: 15px; border-radius: 8px; 
                            border-left: 4px solid #3B82F6; margin: 20px 0;">
                    <h3 style="margin: 0; color: #1E40AF;">{election_title}</h3>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://virmp.app/election/{election_id}/vote" 
                       style="background-color: #3B82F6; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold;">
                        View Election
                    </a>
                </div>
            </div>
        </body>
        </html>
        """,
        subtype="html"
    )
    await fastmail.send_message(message)


# ============ PASSWORD RESET EMAIL ============
async def send_password_reset_email(email: str, username: str, reset_token: str):
    reset_link = f"http://virmp.app/reset-password?token={reset_token}"
    message = MessageSchema(
        subject="VirMP Password Reset Request",
        recipients=[email],
        body=f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #3B82F6; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">🗳️ VirMP</h1>
            </div>
            <div style="padding: 30px; background-color: #F9FAFB;">
                <h2>Password Reset Request</h2>
                <p>Hi {username},</p>
                <p>We received a request to reset your password. Click the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" 
                       style="background-color: #EF4444; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #6B7280; font-size: 14px;">
                    This link expires in 1 hour. If you did not request this, please ignore this email.
                </p>
            </div>
        </body>
        </html>
        """,
        subtype="html"
    )
    await fastmail.send_message(message)