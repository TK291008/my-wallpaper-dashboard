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
resend.api_key = "re_82BoCA6g_4wzCrxvDhxdM9kGMKai1aq4s"

DB_FILE = os.path.join(os.path.dirname(__file__), 'Python', 'wallpapers.db')

# Memory store for active verification codes
verification_codes = {}

class CodeRequest(BaseModel):
    email: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    code: str

@app.get("/")
def home():
    return {"message": "Wallpaper Hub Server Running!"}

@app.post("/api/send-code")
def send_verification_code(data: CodeRequest):
    code = str(random.randint(100000, 999999))
    verification_codes[data.email.lower()] = code
    
    try:
        # Dispatch real email via Resend API
        r = resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": data.email,
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
        print(f"✅ Real Email Sent to {data.email} | ID: {r['id']}")
        return {"status": "success", "message": "Code sent to email inbox"}
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/register")
def register_user(data: RegisterRequest):
    email_clean = data.email.lower()
    
    if verification_codes.get(email_clean) != data.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Secure bcrypt password hash
    salt = bcrypt.gensalt(rounds=12)
    hashed_pw = bcrypt.hashpw(data.password.encode('utf-8'), salt).decode('utf-8')
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO users (username, email, password_hash, is_verified)
            VALUES (?, ?, ?, 1)
        ''', (data.username, email_clean, hashed_pw))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Username or Email already registered")
    
    conn.close()
    del verification_codes[email_clean]
    
    return {"status": "success", "username": data.username}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)