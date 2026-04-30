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
import httpx
from urllib.parse import quote
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
# IMPORTANT: Set JWT_SECRET in your production environment variables (Render/Vercel)
# If not set, a random one is generated, which will log everyone out whenever the server restarts.
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev_secret_key_change_me_in_production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', '')
GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', '')

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    client.close()

# Create the main app
app = FastAPI(title="REZUM API", description="Structured Portfolio Data Platform", lifespan=lifespan)

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
    github_username: Optional[str] = None
    is_admin: bool = False
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class GitHubConnectRequest(BaseModel):
    github_username: str

class GitHubCallbackRequest(BaseModel):
    code: str

class ProjectBase(BaseModel):
    title: str
    description: str
    readme_content: Optional[str] = ""
    tech_stack: List[str] = []
    github_link: Optional[str] = ""
    live_demo_link: Optional[str] = ""
    video_link: Optional[str] = ""

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    readme_content: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    github_link: Optional[str] = None
    live_demo_link: Optional[str] = None
    video_link: Optional[str] = None

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

# --- Hackathon models ---

class HackathonWinner(BaseModel):
    position: int  # 1, 2, 3
    team_name: str
    hackathon_project_id: str
    prize: Optional[str] = ""

class HackathonBase(BaseModel):
    name: str
    description: str
    theme: Optional[str] = ""
    rules: Optional[str] = ""
    prizes: Optional[str] = ""
    start_date: str   # ISO datetime string e.g. "2025-06-01T09:00"
    end_date: str
    registration_deadline: Optional[str] = ""
    submission_deadline: Optional[str] = ""  # when projects must be submitted
    status: str = "draft"  # draft | upcoming | active | past
    registration_link: Optional[str] = ""

class HackathonCreate(HackathonBase):
    pass

class HackathonUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    theme: Optional[str] = None
    rules: Optional[str] = None
    prizes: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    registration_deadline: Optional[str] = None
    submission_deadline: Optional[str] = None
    status: Optional[str] = None
    registration_link: Optional[str] = None
    winners: Optional[List[HackathonWinner]] = None

class HackathonResponse(HackathonBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    winners: List[HackathonWinner] = []
    created_at: str
    updated_at: str

class TeamMemberInput(BaseModel):
    rezum_url: str  # e.g. "https://rezum.app/profile/john-doe-abc1" or just slug

class HackathonProjectBase(BaseModel):
    hackathon_id: str
    title: str
    description: str
    readme_content: Optional[str] = ""
    tech_stack: List[str] = []
    github_link: Optional[str] = ""
    live_demo_link: Optional[str] = ""
    video_link: Optional[str] = ""
    team_members: List[TeamMemberInput] = []

class HackathonProjectCreate(HackathonProjectBase):
    pass

class HackathonProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    readme_content: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    github_link: Optional[str] = None
    live_demo_link: Optional[str] = None
    video_link: Optional[str] = None
    team_members: Optional[List[TeamMemberInput]] = None

class ResolvedMember(BaseModel):
    rezum_url: str
    slug: str
    name: Optional[str] = None
    user_id: Optional[str] = None

class HackathonProjectResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hackathon_id: str
    team_leader_id: str
    title: str
    description: str
    readme_content: str = ""
    tech_stack: List[str] = []
    github_link: str = ""
    live_demo_link: str = ""
    video_link: str = ""
    team_members: List[ResolvedMember] = []
    created_at: str
    updated_at: str

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

async def require_admin(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def _user_to_response(user: dict) -> UserResponse:
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        unique_slug=user["unique_slug"],
        github_username=user.get("github_username"),
        is_admin=user.get("is_admin", False),
        created_at=user["created_at"],
    )

def _extract_slug(rezum_url: str) -> str:
    """Extract unique_slug from a rezum URL or return as-is if already a slug."""
    url = rezum_url.strip().rstrip('/')
    if '/profile/' in url:
        return url.split('/profile/')[-1]
    return url

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    normalized_email = user_data.email.lower().strip()
    # Check if email exists
    existing = await db.users.find_one({"email": normalized_email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    unique_slug = generate_unique_slug(user_data.name)
    
    # Ensure slug is unique
    while await db.users.find_one({"unique_slug": unique_slug}):
        unique_slug = generate_unique_slug(user_data.name)
    
    user_doc = {
        "id": user_id,
        "email": normalized_email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "unique_slug": unique_slug,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)

    token = create_token(user_id)
    return TokenResponse(access_token=token, user=_user_to_response(user_doc))

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    normalized_email = credentials.email.lower().strip()
    user = await db.users.find_one({"email": normalized_email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"])
    return TokenResponse(access_token=token, user=_user_to_response(user))

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return _user_to_response(current_user)

@api_router.patch("/auth/github", response_model=UserResponse)
async def connect_github(data: GitHubConnectRequest, current_user: dict = Depends(get_current_user)):
    """Connect or disconnect a GitHub account by setting the username."""
    username = data.github_username.strip().lstrip('@') if data.github_username else None
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"github_username": username}}
    )
    updated = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return _user_to_response(updated)

@api_router.get("/auth/github/login/authorize")
async def github_login_authorize(redirect_uri: str):
    """Get GitHub OAuth URL for sign-in. No authentication required."""
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to the server .env.")
    state = "login_" + secrets.token_hex(8)
    auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={quote(redirect_uri, safe='')}"
        f"&scope=user:email"
        f"&state={state}"
    )
    return {"url": auth_url}


class GitHubLoginCallbackRequest(BaseModel):
    code: str


@api_router.post("/auth/github/login/callback", response_model=TokenResponse)
async def github_login_callback(data: GitHubLoginCallbackRequest):
    """Sign in or create an account using GitHub OAuth. No authentication required."""
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")

    async with httpx.AsyncClient(timeout=10.0) as http:
        token_res = await http.post(
            "https://github.com/login/oauth/access_token",
            json={"client_id": GITHUB_CLIENT_ID, "client_secret": GITHUB_CLIENT_SECRET, "code": data.code},
            headers={"Accept": "application/json"},
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail=token_data.get("error_description", "Could not obtain GitHub access token"))

        gh_res = await http.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github.v3+json"},
        )
        gh = gh_res.json()
        github_username = gh.get("login")
        github_id = str(gh.get("id", ""))
        github_name = gh.get("name") or github_username

        emails_res = await http.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github.v3+json"},
        )
        emails = emails_res.json() if emails_res.status_code == 200 else []
        primary_email = None
        if isinstance(emails, list):
            primary_email = next(
                (e["email"] for e in emails if e.get("primary") and e.get("verified")), None
            )
            if not primary_email and emails:
                primary_email = emails[0].get("email")
        if not primary_email:
            primary_email = gh.get("email")

    if not github_username:
        raise HTTPException(status_code=400, detail="Could not retrieve GitHub username")
    if not primary_email:
        raise HTTPException(status_code=400, detail="Could not retrieve a verified email from GitHub. Make sure your GitHub account has a public or verified email.")

    primary_email = primary_email.lower()

    # Find existing user by github_id first, then by email
    user = await db.users.find_one({"github_id": github_id}, {"_id": 0})
    if not user:
        user = await db.users.find_one({"email": primary_email}, {"_id": 0})

    if user:
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"github_id": github_id, "github_username": github_username}}
        )
        user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    else:
        user_id = str(uuid.uuid4())
        unique_slug = generate_unique_slug(github_name)
        while await db.users.find_one({"unique_slug": unique_slug}):
            unique_slug = generate_unique_slug(github_name)
        user = {
            "id": user_id,
            "email": primary_email,
            "name": github_name,
            "password_hash": secrets.token_hex(32),
            "unique_slug": unique_slug,
            "github_id": github_id,
            "github_username": github_username,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)

    jwt_token = create_token(user["id"])
    return TokenResponse(access_token=jwt_token, user=_user_to_response(user))


@api_router.get("/auth/github/authorize")
async def github_authorize(redirect_uri: str, current_user: dict = Depends(get_current_user)):
    """Return GitHub OAuth authorization URL."""
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the backend .env.")
    auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={quote(redirect_uri, safe='')}"
        f"&scope=read:user"
        f"&state={current_user['id']}"
    )
    return {"url": auth_url}

@api_router.post("/auth/github/callback", response_model=UserResponse)
async def github_oauth_callback(data: GitHubCallbackRequest, current_user: dict = Depends(get_current_user)):
    """Exchange GitHub OAuth code for the user's GitHub username and save it."""
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")

    async with httpx.AsyncClient(timeout=10.0) as http:
        token_res = await http.post(
            "https://github.com/login/oauth/access_token",
            json={"client_id": GITHUB_CLIENT_ID, "client_secret": GITHUB_CLIENT_SECRET, "code": data.code},
            headers={"Accept": "application/json"},
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            detail = token_data.get("error_description", "Could not obtain access token")
            raise HTTPException(status_code=400, detail=detail)

        user_res = await http.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github.v3+json"},
        )
        github_username = user_res.json().get("login")

    if not github_username:
        raise HTTPException(status_code=400, detail="Could not retrieve GitHub username")

    await db.users.update_one({"id": current_user["id"]}, {"$set": {"github_username": github_username}})
    updated = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return _user_to_response(updated)

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
        "unique_slug": user["unique_slug"],
        "github_username": user.get("github_username")
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

# ============ ADMIN ROUTES ============

@api_router.get("/admin/hackathons", response_model=List[HackathonResponse])
async def admin_list_hackathons(admin_user: dict = Depends(require_admin)):
    hackathons = await db.hackathons.find({}, {"_id": 0}).sort("start_date", -1).to_list(200)
    return hackathons

@api_router.patch("/admin/users/{user_id}/make-admin")
async def make_admin(user_id: str, admin_user: dict = Depends(require_admin)):
    await db.users.update_one({"id": user_id}, {"$set": {"is_admin": True}})
    return {"message": "User granted admin"}

@api_router.get("/admin/users")
async def list_users(admin_user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return users

# ============ HACKATHON ROUTES ============

async def _resolve_team_members(members: List[TeamMemberInput]) -> List[ResolvedMember]:
    resolved = []
    for m in members:
        slug = _extract_slug(m.rezum_url)
        user = await db.users.find_one({"unique_slug": slug}, {"_id": 0})
        resolved.append(ResolvedMember(
            rezum_url=m.rezum_url,
            slug=slug,
            name=user["name"] if user else None,
            user_id=user["id"] if user else None,
        ))
    return resolved

# --- Public hackathon listing ---

@api_router.get("/hackathons", response_model=List[HackathonResponse])
async def list_hackathons(status: Optional[str] = None):
    if status and status != "all":
        query = {"status": status}
    else:
        query = {"status": {"$ne": "draft"}}
    hackathons = await db.hackathons.find(query, {"_id": 0}).sort("start_date", -1).to_list(100)
    return hackathons

@api_router.get("/hackathons/{hackathon_id}", response_model=HackathonResponse)
async def get_hackathon(hackathon_id: str):
    h = await db.hackathons.find_one({"id": hackathon_id}, {"_id": 0})
    if not h:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    return h

# --- Admin hackathon CRUD ---

@api_router.post("/admin/hackathons", response_model=HackathonResponse)
async def create_hackathon(data: HackathonCreate, admin_user: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "winners": [],
        "created_at": now,
        "updated_at": now,
    }
    await db.hackathons.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.put("/admin/hackathons/{hackathon_id}", response_model=HackathonResponse)
async def update_hackathon(hackathon_id: str, data: HackathonUpdate, admin_user: dict = Depends(require_admin)):
    existing = await db.hackathons.find_one({"id": hackathon_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if "winners" in update:
        update["winners"] = [w.model_dump() for w in data.winners]
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.hackathons.update_one({"id": hackathon_id}, {"$set": update})
    updated = await db.hackathons.find_one({"id": hackathon_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/hackathons/{hackathon_id}")
async def delete_hackathon(hackathon_id: str, admin_user: dict = Depends(require_admin)):
    result = await db.hackathons.delete_one({"id": hackathon_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    return {"message": "Hackathon deleted"}

@api_router.get("/admin/hackathons/{hackathon_id}/submissions")
async def get_hackathon_submissions(hackathon_id: str, admin_user: dict = Depends(require_admin)):
    projects = await db.hackathon_projects.find(
        {"hackathon_id": hackathon_id}, {"_id": 0}
    ).to_list(200)
    return projects

# --- Hackathon project submissions (team leader) ---

@api_router.post("/hackathon-projects", response_model=HackathonProjectResponse)
async def create_hackathon_project(data: HackathonProjectCreate, current_user: dict = Depends(get_current_user)):
    hackathon = await db.hackathons.find_one({"id": data.hackathon_id})
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    resolved = await _resolve_team_members(data.team_members)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "hackathon_id": data.hackathon_id,
        "team_leader_id": current_user["id"],
        "title": data.title,
        "description": data.description,
        "readme_content": data.readme_content or "",
        "tech_stack": data.tech_stack,
        "github_link": data.github_link or "",
        "live_demo_link": data.live_demo_link or "",
        "video_link": data.video_link or "",
        "team_members": [m.model_dump() for m in resolved],
        "created_at": now,
        "updated_at": now,
    }
    await db.hackathon_projects.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/hackathon-projects/my", response_model=List[HackathonProjectResponse])
async def get_my_hackathon_projects(current_user: dict = Depends(get_current_user)):
    """Returns hackathon projects where user is the team leader."""
    projects = await db.hackathon_projects.find(
        {"team_leader_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return projects

@api_router.get("/hackathon-projects/member", response_model=List[HackathonProjectResponse])
async def get_member_hackathon_projects(current_user: dict = Depends(get_current_user)):
    """Returns hackathon projects where user is a team member (by user_id in resolved members)."""
    projects = await db.hackathon_projects.find(
        {"team_members.user_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return projects

@api_router.put("/hackathon-projects/{project_id}", response_model=HackathonProjectResponse)
async def update_hackathon_project(project_id: str, data: HackathonProjectUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.hackathon_projects.find_one({"id": project_id, "team_leader_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found or not authorized")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if "team_members" in update:
        resolved = await _resolve_team_members(data.team_members)
        update["team_members"] = [m.model_dump() for m in resolved]
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.hackathon_projects.update_one({"id": project_id}, {"$set": update})
    updated = await db.hackathon_projects.find_one({"id": project_id}, {"_id": 0})
    return updated

@api_router.delete("/hackathon-projects/{project_id}")
async def delete_hackathon_project(project_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.hackathon_projects.delete_one({"id": project_id, "team_leader_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found or not authorized")
    return {"message": "Hackathon project deleted"}

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

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
