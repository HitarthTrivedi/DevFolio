import asyncio
import hashlib
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    raise ValueError("MONGO_URL environment variable is not set")
client = AsyncIOMotorClient(mongo_url)
db = client['devfolio']

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

async def reset_password():
    email = "hitartht318@gmail.com".lower().strip()
    new_password = "password123"
    hashed = hash_password(new_password)
    
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": hashed}}
    )
    if result.modified_count > 0:
        print(f"Password reset successfully for {email}. New password: '{new_password}'")
    else:
        print(f"User with email {email} not found or password was already that value.")

if __name__ == "__main__":
    asyncio.run(reset_password())
