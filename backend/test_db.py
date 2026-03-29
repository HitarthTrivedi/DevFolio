import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    raise ValueError("MONGO_URL environment variable is not set")
client = AsyncIOMotorClient(mongo_url)
db = client['devfolio']

async def main():
    users = await db.users.find().to_list(100)
    for u in users:
        print(f"Email: {u.get('email')}, Hash: {u.get('password_hash')}")

if __name__ == "__main__":
    asyncio.run(main())
