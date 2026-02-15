from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import jwt
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="DevFolio API", description="AI-Readable Portfolio Platform")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ============ MODELS ============

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    unique_slug: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ProjectBase(BaseModel):
    title: str
    description: str
    readme_content: Optional[str] = ""
    tech_stack: List[str] = []
    github_link: Optional[str] = ""
    live_demo_link: Optional[str] = ""

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    readme_content: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    github_link: Optional[str] = None
    live_demo_link: Optional[str] = None

class ProjectResponse(ProjectBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    created_at: str
    updated_at: str

class AchievementBase(BaseModel):
    title: str
    description: str
    date: str
    certificate_link: Optional[str] = ""

class AchievementCreate(AchievementBase):
    pass

class AchievementUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    certificate_link: Optional[str] = None

class AchievementResponse(AchievementBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    created_at: str

class PublicProfileResponse(BaseModel):
    name: str
    projects: Optional[List[ProjectResponse]] = None
    achievements: Optional[List[AchievementResponse]] = None
    export_url: str

class AIExportResponse(BaseModel):
    user: dict
    projects: Optional[List[dict]] = None
    achievements: Optional[List[dict]] = None
    metadata: dict

# ============ HELPERS ============

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "exp": expiration,
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def generate_unique_slug(name: str) -> str:
    base_slug = name.lower().replace(" ", "-")
    unique_part = secrets.token_hex(4)
    return f"{base_slug}-{unique_part}"

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    unique_slug = generate_unique_slug(user_data.name)
    
    # Ensure slug is unique
    while await db.users.find_one({"unique_slug": unique_slug}):
        unique_slug = generate_unique_slug(user_data.name)
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "unique_slug": unique_slug,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        unique_slug=unique_slug,
        created_at=user_doc["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"])
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        unique_slug=user["unique_slug"],
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        unique_slug=current_user["unique_slug"],
        created_at=current_user["created_at"]
    )

# ============ PROJECT ROUTES ============

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, current_user: dict = Depends(get_current_user)):
    project_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    project_doc = {
        "id": project_id,
        "user_id": current_user["id"],
        **project.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    
    await db.projects.insert_one(project_doc)
    
    return ProjectResponse(**{k: v for k, v in project_doc.items() if k != "_id"})

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(current_user: dict = Depends(get_current_user)):
    projects = await db.projects.find(
        {"user_id": current_user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return projects

@api_router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await db.projects.find_one(
        {"id": project_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project_update: ProjectUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.projects.find_one({"id": project_id, "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {k: v for k, v in project_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": update_data}
    )
    
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return updated

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.projects.delete_one({"id": project_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted"}

# ============ ACHIEVEMENT ROUTES ============

@api_router.post("/achievements", response_model=AchievementResponse)
async def create_achievement(achievement: AchievementCreate, current_user: dict = Depends(get_current_user)):
    achievement_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    achievement_doc = {
        "id": achievement_id,
        "user_id": current_user["id"],
        **achievement.model_dump(),
        "created_at": now
    }
    
    await db.achievements.insert_one(achievement_doc)
    
    return AchievementResponse(**{k: v for k, v in achievement_doc.items() if k != "_id"})

@api_router.get("/achievements", response_model=List[AchievementResponse])
async def get_achievements(current_user: dict = Depends(get_current_user)):
    achievements = await db.achievements.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return achievements

@api_router.get("/achievements/{achievement_id}", response_model=AchievementResponse)
async def get_achievement(achievement_id: str, current_user: dict = Depends(get_current_user)):
    achievement = await db.achievements.find_one(
        {"id": achievement_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    return achievement

@api_router.put("/achievements/{achievement_id}", response_model=AchievementResponse)
async def update_achievement(achievement_id: str, achievement_update: AchievementUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.achievements.find_one({"id": achievement_id, "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Achievement not found")
    
    update_data = {k: v for k, v in achievement_update.model_dump().items() if v is not None}
    
    await db.achievements.update_one(
        {"id": achievement_id},
        {"$set": update_data}
    )
    
    updated = await db.achievements.find_one({"id": achievement_id}, {"_id": 0})
    return updated

@api_router.delete("/achievements/{achievement_id}")
async def delete_achievement(achievement_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.achievements.delete_one({"id": achievement_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Achievement not found")
    return {"message": "Achievement deleted"}

# ============ PUBLIC PROFILE & AI EXPORT ============

@api_router.get("/profile/{slug}")
async def get_public_profile(slug: str, sections: str = "all"):
    """
    Get public profile by unique slug.
    sections: 'all', 'projects', 'achievements'
    """
    user = await db.users.find_one({"unique_slug": slug}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    response = {
        "name": user["name"],
        "unique_slug": user["unique_slug"]
    }
    
    if sections in ["all", "projects"]:
        projects = await db.projects.find(
            {"user_id": user["id"]},
            {"_id": 0, "user_id": 0}
        ).to_list(100)
        response["projects"] = projects
    
    if sections in ["all", "achievements"]:
        achievements = await db.achievements.find(
            {"user_id": user["id"]},
            {"_id": 0, "user_id": 0}
        ).to_list(100)
        response["achievements"] = achievements
    
    return response

@api_router.get("/export/{slug}")
async def export_for_ai(slug: str, sections: str = "all", format: str = "json"):
    """
    AI-readable export endpoint.
    sections: 'all', 'projects', 'achievements'
    format: 'json' (default)
    
    This endpoint returns structured data optimized for AI consumption.
    """
    user = await db.users.find_one({"unique_slug": slug}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    export_data = {
        "user": {
            "name": user["name"],
            "profile_url": f"/profile/{slug}"
        },
        "metadata": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "sections_included": sections,
            "format": format,
            "version": "1.0"
        }
    }
    
    if sections in ["all", "projects"]:
        projects = await db.projects.find(
            {"user_id": user["id"]},
            {"_id": 0, "user_id": 0}
        ).to_list(100)
        export_data["projects"] = [{
            "title": p["title"],
            "description": p["description"],
            "readme_content": p.get("readme_content", ""),
            "tech_stack": p.get("tech_stack", []),
            "github_link": p.get("github_link", ""),
            "live_demo_link": p.get("live_demo_link", ""),
            "created_at": p.get("created_at", "")
        } for p in projects]
        export_data["metadata"]["total_projects"] = len(projects)
    
    if sections in ["all", "achievements"]:
        achievements = await db.achievements.find(
            {"user_id": user["id"]},
            {"_id": 0, "user_id": 0}
        ).to_list(100)
        export_data["achievements"] = [{
            "title": a["title"],
            "description": a["description"],
            "date": a.get("date", ""),
            "certificate_link": a.get("certificate_link", "")
        } for a in achievements]
        export_data["metadata"]["total_achievements"] = len(achievements)
    
    return export_data

# ============ HEALTH CHECK ============

@api_router.get("/")
async def root():
    return {"message": "DevFolio API is running", "version": "1.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
