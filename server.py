from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import resend
import random
import bcrypt
import sqlite3
import os

app = FastAPI()

# Enable CORS so your frontend script.js can connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Put your NEW Resend API Key here
resend.api_key = "re_26w9MMVK_8jXW4QP4Da7GYJQfbaPWSf4x"

DB_FILE = os.path.join(os.path.dirname(__file__), 'Python', 'wallpapers.db')

# Memory store for active verification codes
verification_codes = {}

class CodeRequest(BaseModel):
    username: str
    email: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    code: str

class AvailabilityRequest(BaseModel):
    username: str
    email: str

@app.get("/")
def home():
    return {"message": "Wallpaper Hub Server Running!"}

@app.post("/api/send-code")
async def send_verification_code(data: CodeRequest):
    email_clean = (data.email or "").strip().lower()
    username_clean = (data.username or "").strip()

    if not email_clean or not username_clean:
        raise HTTPException(status_code=400, detail="Email and username are required.")

    conn = sqlite3.connect(DB_FILE)
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT username, email FROM users WHERE lower(username) = ? OR lower(email) = ? LIMIT 1",
            (username_clean.lower(), email_clean),
        )
        existing_user = cursor.fetchone()
        if existing_user:
            matched_username, matched_email = existing_user
            if matched_username.lower() == username_clean.lower() and matched_email.lower() == email_clean:
                raise HTTPException(status_code=400, detail="Username and email are already in use.")
            if matched_username.lower() == username_clean.lower():
                raise HTTPException(status_code=400, detail="Username is already taken.")
            if matched_email.lower() == email_clean:
                raise HTTPException(status_code=400, detail="Email is already registered. Please sign in.")
    finally:
        conn.close()

    # Generate code and dispatch email via Resend
    code = str(random.randint(100000, 999999))
    verification_codes[email_clean] = code

    try:
        r = resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": email_clean,
            "subject": "Verification Code - Wallpaper Hub",
            "html": f"""
                <div style="font-family: sans-serif; padding: 20px; background: #1e1e2e; color: #fff; border-radius: 8px;">
                    <h2>Welcome to Wallpaper Hub!</h2>
                    <p>Your 6-digit email verification code is:</p>
                    <h1 style="letter-spacing: 5px; color: #6366f1;">{code}</h1>
                    <p style="color: #aaa; font-size: 12px;">If you didn't request this, ignore this email.</p>
                </div>
            """
        })
        print(f"✅ Real Email Sent to {email_clean} | ID: {r['id']}")
        return {"status": "success", "message": "Code sent to email inbox"}
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/check-availability")
async def check_availability(data: AvailabilityRequest):
    email_clean = (data.email or "").strip().lower()
    username_clean = (data.username or "").strip()

    if not username_clean and not email_clean:
        return {
            "available": True,
            "usernameAvailable": True,
            "emailAvailable": True,
            "usernameMessage": "",
            "emailMessage": ""
        }

    conn = sqlite3.connect(DB_FILE)
    try:
        cursor = conn.cursor()
        username_available = True
        email_available = True
        username_message = ""
        email_message = ""

        if username_clean:
            cursor.execute(
                "SELECT 1 FROM users WHERE lower(username) = ? LIMIT 1",
                (username_clean.lower(),),
            )
            if cursor.fetchone():
                username_available = False
                username_message = "This username is already taken."

        if email_clean:
            cursor.execute(
                "SELECT 1 FROM users WHERE lower(email) = ? LIMIT 1",
                (email_clean,),
            )
            if cursor.fetchone():
                email_available = False
                email_message = "This email is already registered."

        return {
            "available": username_available and email_available,
            "usernameAvailable": username_available,
            "emailAvailable": email_available,
            "usernameMessage": username_message,
            "emailMessage": email_message,
        }
    finally:
        conn.close()

@app.post("/api/register")
def register_user(data: RegisterRequest):
    email_clean = data.email.strip().lower()
    username_clean = data.username.strip()

    if verification_codes.get(email_clean) != data.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    conn = sqlite3.connect(DB_FILE)
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT 1 FROM users WHERE lower(username) = ? OR lower(email) = ? LIMIT 1",
            (username_clean.lower(), email_clean),
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username or Email already registered. Please sign in instead.")

        salt = bcrypt.gensalt(rounds=12)
        hashed_pw = bcrypt.hashpw(data.password.encode('utf-8'), salt).decode('utf-8')
        cursor.execute(
            """
            INSERT INTO users (username, email, password_hash, is_verified)
            VALUES (?, ?, ?, 1)
            """,
            (username_clean, email_clean, hashed_pw),
        )
        conn.commit()
    except sqlite3.IntegrityError as exc:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Username or Email already registered. Please sign in instead.") from exc
    finally:
        conn.close()

    verification_codes.pop(email_clean, None)

    return {"status": "success", "username": username_clean}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)