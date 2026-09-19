from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
import secrets
import re
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import io
from openpyxl import Workbook

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "marketer"  # superuser, administrator, client_manager, or marketer

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str

class BulkInviteRequest(BaseModel):
    emails: List[str]
    role: str = "marketer"

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    full_name: str
    role: str
    must_change_password: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Client(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    policy_id: str
    client_name: str
    platform: str
    account_type: str
    plan: str
    client_status: str
    client_managers: List[str]  # List of user IDs
    engagement_solutions_client: str
    global_status_email: str
    global_status_direct_mail: str
    global_status_phone: str
    global_status_direct_sms: str
    custom_fields: dict = Field(default_factory=dict)
    created_by: str
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientCreate(BaseModel):
    policy_id: str
    client_name: str
    platform: str
    account_type: str
    plan: str
    client_status: str
    client_managers: List[str]
    engagement_solutions_client: str
    global_status_email: str
    global_status_direct_mail: str
    global_status_phone: str
    global_status_direct_sms: str

class ClientUpdate(BaseModel):
    policy_id: Optional[str] = None
    client_name: Optional[str] = None
    platform: Optional[str] = None
    account_type: Optional[str] = None
    plan: Optional[str] = None
    client_status: Optional[str] = None
    client_managers: Optional[List[str]] = None
    engagement_solutions_client: Optional[str] = None
    global_status_email: Optional[str] = None
    global_status_direct_mail: Optional[str] = None
    global_status_phone: Optional[str] = None
    global_status_direct_sms: Optional[str] = None

class DropdownConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    field_name: str
    display_label: str
    options: List[str]
    is_custom: bool = False
    field_type: str = "dropdown"  # dropdown, text, date
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action: str
    user_id: str
    user_name: str
    field_name: str
    old_values: List[str]
    new_values: List[str]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_name: str
    client_id: Optional[str] = None  # deprecated: campaigns are now global
    election_start_date: str  # ISO date string
    election_end_date: str    # ISO date string
    channel: str
    marketing_contacts: List[str]  # List of user IDs (Campaign Managers)
    article_url: str = ""
    campaign_products: List[str]
    custom_fields: dict = Field(default_factory=dict)
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CampaignCreate(BaseModel):
    campaign_name: str
    election_start_date: str
    election_end_date: str
    channel: str
    marketing_contacts: List[str]
    article_url: str = ""
    campaign_products: List[str]

class CampaignUpdate(BaseModel):
    campaign_name: Optional[str] = None
    election_start_date: Optional[str] = None
    election_end_date: Optional[str] = None
    channel: Optional[str] = None
    marketing_contacts: Optional[List[str]] = None
    article_url: Optional[str] = None
    campaign_products: Optional[List[str]] = None

ELECTION_DECISIONS = {"not_elected", "opt_in", "opt_out"}

class ElectionUpdate(BaseModel):
    decision: str  # not_elected | opt_in | opt_out

# Auth utilities
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Audit logging helper
async def log_activity(
    entity_type: str,
    entity_id: str,
    entity_name: str,
    action: str,
    user_id: str,
    user_name: str,
    changes: dict = None,
    client_id: str = None
):
    """Log activity for audit trail"""
    activity = {
        "id": str(uuid.uuid4()),
        "entity_type": entity_type,  # "client" or "campaign"
        "entity_id": entity_id,
        "entity_name": entity_name,
        "action": action,  # "created", "updated", "deleted"
        "user_id": user_id,
        "user_name": user_name,
        "changes": changes or {},
        "client_id": client_id,  # For campaigns, link to parent client
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.activity_logs.insert_one(activity)
    return activity

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

def is_admin_or_superuser(user: User) -> bool:
    """Check if user is administrator or superuser"""
    return user.role in ["administrator", "superuser"]

def is_superuser(user: User) -> bool:
    """Check if user is superuser"""
    return user.role == "superuser"

def is_client_manager(user: User) -> bool:
    return user.role == "client_manager"

def is_campaign_manager(user: User) -> bool:
    """Campaign Manager is stored under the legacy 'marketer' role"""
    return user.role == "marketer"

# Auth endpoints
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user_data.model_dump()
    hashed_password = get_password_hash(user_dict.pop("password"))
    user = User(**user_dict)
    
    doc = user.model_dump()
    doc["password"] = hashed_password
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.users.insert_one(doc)
    
    # Create token
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Remove password from response
    user.pop("password")
    user_obj = User(**user)
    
    access_token = create_access_token(
        data={"sub": user_obj.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.post("/auth/change-password")
async def change_password(payload: ChangePasswordRequest, current_user: User = Depends(get_current_user)):
    """Change the current user's password. Used for forced first-login password reset."""
    user = await db.users.find_one({"id": current_user.id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(payload.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    if verify_password(payload.new_password, user["password"]):
        raise HTTPException(status_code=400, detail="New password must be different from the current password")

    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"password": get_password_hash(payload.new_password), "must_change_password": False}}
    )
    return {"message": "Password changed successfully"}

@api_router.post("/auth/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """Generate password reset token for user"""
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If the email exists, a password reset link has been generated"}
    
    # Generate reset token
    reset_token = str(uuid.uuid4())
    reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)  # Token valid for 1 hour
    
    # Store reset token in database
    await db.password_resets.delete_many({"email": request.email})  # Remove old tokens
    await db.password_resets.insert_one({
        "email": request.email,
        "token": reset_token,
        "expires_at": reset_expires.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # In production, send email here. For now, return the token for testing
    # TODO: Integrate with email service
    reset_url = f"/reset-password?token={reset_token}"
    
    return {
        "message": "If the email exists, a password reset link has been generated",
        "reset_url": reset_url,  # Remove this in production with email
        "token": reset_token  # Remove this in production with email
    }

@api_router.post("/auth/reset-password")
async def reset_password(reset_data: PasswordReset):
    """Reset password using token"""
    # Find valid reset token
    reset_request = await db.password_resets.find_one({"token": reset_data.token}, {"_id": 0})
    
    if not reset_request:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if token is expired
    expires_at = datetime.fromisoformat(reset_request["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({"token": reset_data.token})
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update user password
    hashed_password = get_password_hash(reset_data.new_password)
    result = await db.users.update_one(
        {"email": reset_request["email"]},
        {"$set": {"password": hashed_password}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update password")
    
    # Delete used token
    await db.password_resets.delete_one({"token": reset_data.token})
    
    return {"message": "Password has been reset successfully"}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# User management endpoints (superuser only)
@api_router.get("/users", response_model=List[User])
async def list_users(current_user: User = Depends(get_current_user)):
    if not is_superuser(current_user):
        raise HTTPException(status_code=403, detail="Only superusers can manage users")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [User(**user) for user in users]

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    if not is_superuser(current_user):
        raise HTTPException(status_code=403, detail="Only superusers can create users")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user_data.model_dump()
    hashed_password = get_password_hash(user_dict.pop("password"))
    user = User(**user_dict)
    
    doc = user.model_dump()
    doc["password"] = hashed_password
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.users.insert_one(doc)
    return user

ALLOWED_INVITE_ROLES = {"administrator", "client_manager", "marketer", "superuser"}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def _generate_temp_password() -> str:
    # 12-char URL-safe temporary password
    return secrets.token_urlsafe(9)

@api_router.post("/users/bulk-invite")
async def bulk_invite_users(payload: BulkInviteRequest, current_user: User = Depends(get_current_user)):
    if not is_superuser(current_user):
        raise HTTPException(status_code=403, detail="Only superusers can invite users")

    role = payload.role if payload.role in ALLOWED_INVITE_ROLES else "marketer"

    results = []
    seen = set()
    for raw in payload.emails:
        email = (raw or "").strip().lower()
        if not email:
            continue
        if email in seen:
            results.append({"email": email, "status": "duplicate", "temp_password": None, "reason": "Duplicate in list"})
            continue
        seen.add(email)

        if not EMAIL_RE.match(email):
            results.append({"email": email, "status": "invalid", "temp_password": None, "reason": "Invalid email format"})
            continue

        existing = await db.users.find_one({"email": email})
        if existing:
            results.append({"email": email, "status": "skipped", "temp_password": None, "reason": "Already registered"})
            continue

        temp_password = _generate_temp_password()
        full_name = email.split("@")[0].replace(".", " ").replace("_", " ").title()
        user = User(email=email, full_name=full_name, role=role, must_change_password=True)
        doc = user.model_dump()
        doc["password"] = get_password_hash(temp_password)
        doc["created_at"] = doc["created_at"].isoformat()
        await db.users.insert_one(doc)
        results.append({"email": email, "status": "invited", "temp_password": temp_password, "reason": None})

    summary = {
        "invited": sum(1 for r in results if r["status"] == "invited"),
        "skipped": sum(1 for r in results if r["status"] == "skipped"),
        "invalid": sum(1 for r in results if r["status"] == "invalid"),
        "duplicate": sum(1 for r in results if r["status"] == "duplicate"),
        "total": len(results),
    }
    return {"role": role, "summary": summary, "results": results}

@api_router.put("/users/{user_id}", response_model=User)
async def update_user_role(
    user_id: str,
    role: str,
    current_user: User = Depends(get_current_user)
):
    if not is_superuser(current_user):
        raise HTTPException(status_code=403, detail="Only superusers can update user roles")
    
    # Don't allow changing own role
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return User(**updated_user)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if not is_superuser(current_user):
        raise HTTPException(status_code=403, detail="Only superusers can delete users")
    
    # Don't allow deleting yourself
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

# User lookup endpoint
@api_router.get("/users/search")
async def search_users(q: str = "", current_user: User = Depends(get_current_user)):
    query = {}
    if q:
        query["$or"] = [
            {"full_name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}}
        ]
    
    users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(50)
    return users

# Client endpoints
@api_router.post("/clients", response_model=Client)
async def create_client(client_data: ClientCreate, current_user: User = Depends(get_current_user)):
    if not is_admin_or_superuser(current_user):
        raise HTTPException(status_code=403, detail="Only administrators and superusers can create clients")
    
    client = Client(**client_data.model_dump(), created_by=current_user.id)
    doc = client.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    
    await db.clients.insert_one(doc)
    
    # Log the activity
    await log_activity(
        entity_type="client",
        entity_id=client.id,
        entity_name=client.client_name,
        action="created",
        user_id=current_user.id,
        user_name=current_user.full_name,
        client_id=client.id
    )
    
    return client

@api_router.get("/clients", response_model=List[Client])
async def list_clients(
    search: str = "",
    platform: str = "",
    client_status: str = "",
    scope: str = "mine",
    current_user: User = Depends(get_current_user)
):
    # Campaign Managers (marketer role) have no access to clients
    if is_campaign_manager(current_user):
        raise HTTPException(status_code=403, detail="Campaign Managers do not have access to clients")

    query = {}

    # Client Managers default to their assigned clients; can toggle to view all
    if is_client_manager(current_user) and scope != "all":
        query["client_managers"] = current_user.id

    if search:
        query["$or"] = [
            {"client_name": {"$regex": search, "$options": "i"}},
            {"policy_id": {"$regex": search, "$options": "i"}}
        ]
    
    if platform:
        query["platform"] = platform
    
    if client_status:
        query["client_status"] = client_status
    
    clients = await db.clients.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Convert ISO strings back to datetime
    for client in clients:
        if isinstance(client.get("created_at"), str):
            client["created_at"] = datetime.fromisoformat(client["created_at"])
        if isinstance(client.get("updated_at"), str):
            client["updated_at"] = datetime.fromisoformat(client["updated_at"])
    
    return clients

@api_router.get("/clients/election-summary")
async def clients_election_summary(current_user: User = Depends(get_current_user)):
    """Per-client counts of opt-in / opt-out / pending across all (global) campaigns."""
    if is_campaign_manager(current_user):
        raise HTTPException(status_code=403, detail="Campaign Managers do not have access to clients")

    total_campaigns = await db.campaigns.count_documents({})
    elections = await db.elections.find({}, {"_id": 0, "client_id": 1, "decision": 1}).to_list(1000000)

    summaries = {}
    for e in elections:
        cid = e.get("client_id")
        if not cid:
            continue
        s = summaries.setdefault(cid, {"opt_in": 0, "opt_out": 0})
        if e.get("decision") == "opt_in":
            s["opt_in"] += 1
        elif e.get("decision") == "opt_out":
            s["opt_out"] += 1

    for cid, s in summaries.items():
        s["pending"] = max(total_campaigns - s["opt_in"] - s["opt_out"], 0)

    return {"total_campaigns": total_campaigns, "summaries": summaries}

@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str, current_user: User = Depends(get_current_user)):
    if is_campaign_manager(current_user):
        raise HTTPException(status_code=403, detail="Campaign Managers do not have access to clients")

    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Convert ISO strings back to datetime
    if isinstance(client.get("created_at"), str):
        client["created_at"] = datetime.fromisoformat(client["created_at"])
    if isinstance(client.get("updated_at"), str):
        client["updated_at"] = datetime.fromisoformat(client["updated_at"])
    
    return Client(**client)

@api_router.get("/clients/{client_id}/activity")
async def get_client_activity(client_id: str, current_user: User = Depends(get_current_user)):
    """Get activity timeline for a client (includes client and election changes)"""
    if is_campaign_manager(current_user):
        raise HTTPException(status_code=403, detail="Campaign Managers do not have access to clients")

    # Check if client exists
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Fetch all activity logs for this client and its elections
    activities = await db.activity_logs.find(
        {
            "$or": [
                {"entity_id": client_id},  # Client activities
                {"client_id": client_id}   # Election/campaign activities for this client
            ]
        },
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)  # Most recent first, limit to 100
    
    return activities

@api_router.put("/clients/{client_id}", response_model=Client)
async def update_client(
    client_id: str,
    client_data: ClientUpdate,
    current_user: User = Depends(get_current_user)
):
    if not is_admin_or_superuser(current_user):
        raise HTTPException(status_code=403, detail="Only administrators and superusers can update clients")
    
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Track changes for audit log
    changes = {}
    update_data = {k: v for k, v in client_data.model_dump().items() if v is not None}
    
    for key, new_value in update_data.items():
        old_value = client.get(key)
        if old_value != new_value:
            changes[key] = {"old": old_value, "new": new_value}
    
    # Only update and log if there are changes
    if changes:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.clients.update_one({"id": client_id}, {"$set": update_data})
        
        # Log the activity
        await log_activity(
            entity_type="client",
            entity_id=client_id,
            entity_name=client.get("client_name", "Unknown"),
            action="updated",
            user_id=current_user.id,
            user_name=current_user.full_name,
            changes=changes,
            client_id=client_id
        )
    
    updated_client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    
    # Convert ISO strings back to datetime
    if isinstance(updated_client.get("created_at"), str):
        updated_client["created_at"] = datetime.fromisoformat(updated_client["created_at"])
    if isinstance(updated_client.get("updated_at"), str):
        updated_client["updated_at"] = datetime.fromisoformat(updated_client["updated_at"])
    
    return Client(**updated_client)

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: User = Depends(get_current_user)):
    if not is_admin_or_superuser(current_user):
        raise HTTPException(status_code=403, detail="Only administrators and superusers can delete clients")
    
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {"message": "Client deleted successfully"}

# Dropdown configuration endpoints
async def initialize_dropdown_configs():
    """Initialize default dropdown configurations if they don't exist"""
    default_configs = [
        {"field_name": "platform", "display_label": "Platform", "options": ["UNET", "USP"], "is_custom": False},
        {"field_name": "account_type", "display_label": "Account Type", "options": ["NA", "KA", "PS", "SP"], "is_custom": False},
        {"field_name": "plan", "display_label": "Plan", "options": ["UHC", "Surest"], "is_custom": False},
        {"field_name": "client_status", "display_label": "Client Status", "options": ["Active", "Inactive"], "is_custom": False},
        {"field_name": "engagement_solutions_client", "display_label": "Engagement Solutions Client", "options": ["Yes", "No"], "is_custom": False},
        {"field_name": "global_status", "display_label": "Global Status", "options": ["Opt In", "Opt Out"], "is_custom": False},
        {"field_name": "campaign_channel", "display_label": "Campaign Channel", "options": ["Email", "Direct Mail", "Phone", "SMS", "Social Media"], "is_custom": False},
        {"field_name": "campaign_products", "display_label": "Campaign Products", "options": ["Medicare Advantage", "Medicare Supplement", "Part D", "Dual Eligible", "ACA"], "is_custom": False},
    ]
    
    for config in default_configs:
        existing = await db.dropdown_configs.find_one({"field_name": config["field_name"]})
        if not existing:
            config["updated_at"] = datetime.now(timezone.utc).isoformat()
            config["field_type"] = "dropdown"
            await db.dropdown_configs.insert_one(config)
        elif "display_label" not in existing:
            # Update existing configs to add display_label
            await db.dropdown_configs.update_one(
                {"field_name": config["field_name"]},
                {"$set": {"display_label": config["display_label"], "is_custom": False, "field_type": "dropdown"}}
            )

@app.on_event("startup")
async def startup_event():
    await initialize_dropdown_configs()

@api_router.get("/dropdown-configs")
async def get_dropdown_configs(current_user: User = Depends(get_current_user)):
    configs = await db.dropdown_configs.find({}, {"_id": 0}).to_list(100)
    for config in configs:
        if isinstance(config.get("updated_at"), str):
            config["updated_at"] = datetime.fromisoformat(config["updated_at"])
    return configs

@api_router.put("/dropdown-configs/{field_name}")
async def update_dropdown_config(
    field_name: str,
    options: List[str],
    current_user: User = Depends(get_current_user)
):
    if not is_admin_or_superuser(current_user):
        raise HTTPException(status_code=403, detail="Only administrators and superusers can update dropdown configurations")
    
    if not options or len(options) == 0:
        raise HTTPException(status_code=400, detail="Options list cannot be empty")
    
    config = await db.dropdown_configs.find_one({"field_name": field_name})
    if not config:
        raise HTTPException(status_code=404, detail="Dropdown configuration not found")
    
    # Store old values for audit log
    old_values = config.get("options", [])
    
    update_data = {
        "options": options,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.dropdown_configs.update_one({"field_name": field_name}, {"$set": update_data})
    
    # Create audit log entry
    audit_log = AuditLog(
        action="dropdown_config_updated",
        user_id=current_user.id,
        user_name=current_user.full_name,
        field_name=field_name,
        old_values=old_values,
        new_values=options
    )
    audit_doc = audit_log.model_dump()
    audit_doc["timestamp"] = audit_doc["timestamp"].isoformat()
    await db.audit_logs.insert_one(audit_doc)
    
    updated_config = await db.dropdown_configs.find_one({"field_name": field_name}, {"_id": 0})
    if isinstance(updated_config.get("updated_at"), str):
        updated_config["updated_at"] = datetime.fromisoformat(updated_config["updated_at"])
    
    return updated_config

@api_router.get("/audit-logs")
async def get_audit_logs(
    field_name: str = "",
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    if not is_admin_or_superuser(current_user):
        raise HTTPException(status_code=403, detail="Only administrators and superusers can view audit logs")
    
    query = {"action": "dropdown_config_updated"}
    if field_name:
        query["field_name"] = field_name
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    
    # Convert ISO strings back to datetime
    for log in logs:
        if isinstance(log.get("timestamp"), str):
            log["timestamp"] = datetime.fromisoformat(log["timestamp"])
    
    return logs

@api_router.put("/dropdown-configs/{field_name}/label")
async def update_field_label(
    field_name: str,
    display_label: str,
    current_user: User = Depends(get_current_user)
):
    if not is_admin_or_superuser(current_user):
        raise HTTPException(status_code=403, detail="Only administrators and superusers can update field labels")
    
    config = await db.dropdown_configs.find_one({"field_name": field_name})
    if not config:
        raise HTTPException(status_code=404, detail="Field not found")
    
    await db.dropdown_configs.update_one(
        {"field_name": field_name},
        {"$set": {"display_label": display_label, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Field label updated successfully", "field_name": field_name, "display_label": display_label}

@api_router.post("/dropdown-configs")
async def create_custom_field(
    field_name: str,
    display_label: str,
    options: List[str],
    current_user: User = Depends(get_current_user)
):
    if not is_admin_or_superuser(current_user):
        raise HTTPException(status_code=403, detail="Only administrators and superusers can create custom fields")
    
    # Validate field_name (no spaces, lowercase, alphanumeric + underscore)
    if not re.match(r'^[a-z0-9_]+$', field_name):
        raise HTTPException(status_code=400, detail="Field name must be lowercase alphanumeric with underscores only")
    
    # Check if field already exists
    existing = await db.dropdown_configs.find_one({"field_name": field_name})
    if existing:
        raise HTTPException(status_code=400, detail="Field with this name already exists")
    
    # Create new custom field
    new_field = {
        "field_name": field_name,
        "display_label": display_label,
        "options": options,
        "is_custom": True,
        "field_type": "dropdown",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.dropdown_configs.insert_one(new_field)
    
    # Create audit log
    audit_log = AuditLog(
        action="custom_field_created",
        user_id=current_user.id,
        user_name=current_user.full_name,
        field_name=field_name,
        old_values=[],
        new_values=options
    )
    audit_doc = audit_log.model_dump()
    audit_doc["timestamp"] = audit_doc["timestamp"].isoformat()
    await db.audit_logs.insert_one(audit_doc)
    
    return {"message": "Custom field created successfully", "field_name": field_name}

@api_router.delete("/dropdown-configs/{field_name}")
async def delete_custom_field(
    field_name: str,
    current_user: User = Depends(get_current_user)
):
    if not is_admin_or_superuser(current_user):
        raise HTTPException(status_code=403, detail="Only administrators and superusers can delete custom fields")
    
    config = await db.dropdown_configs.find_one({"field_name": field_name})
    if not config:
        raise HTTPException(status_code=404, detail="Field not found")
    
    if not config.get("is_custom", False):
        raise HTTPException(status_code=400, detail="Cannot delete built-in fields")
    
    await db.dropdown_configs.delete_one({"field_name": field_name})
    
    return {"message": "Custom field deleted successfully"}

# Campaign endpoints
@api_router.post("/campaigns", response_model=Campaign)
async def create_campaign(campaign_data: CampaignCreate, current_user: User = Depends(get_current_user)):
    if not is_admin_or_superuser(current_user):
        raise HTTPException(status_code=403, detail="Only administrators and superusers can create campaigns")

    campaign = Campaign(**campaign_data.model_dump(), created_by=current_user.id)
    doc = campaign.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    
    await db.campaigns.insert_one(doc)
    
    # Log the activity (global campaign, no owning client)
    await log_activity(
        entity_type="campaign",
        entity_id=campaign.id,
        entity_name=campaign.campaign_name,
        action="created",
        user_id=current_user.id,
        user_name=current_user.full_name,
    )
    
    return campaign

@api_router.get("/campaigns", response_model=List[Campaign])
async def list_campaigns(
    search: str = "",
    channel: str = "",
    scope: str = "mine",
    current_user: User = Depends(get_current_user)
):
    query = {}

    # Campaign Managers (marketer) default to assigned campaigns; can toggle to all
    if is_campaign_manager(current_user) and scope != "all":
        query["marketing_contacts"] = current_user.id

    if search:
        query["campaign_name"] = {"$regex": search, "$options": "i"}
    
    if channel:
        query["channel"] = channel
    
    campaigns = await db.campaigns.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for campaign in campaigns:
        if isinstance(campaign.get("created_at"), str):
            campaign["created_at"] = datetime.fromisoformat(campaign["created_at"])
        if isinstance(campaign.get("updated_at"), str):
            campaign["updated_at"] = datetime.fromisoformat(campaign["updated_at"])
    
    return campaigns

@api_router.get("/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str, current_user: User = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if isinstance(campaign.get("created_at"), str):
        campaign["created_at"] = datetime.fromisoformat(campaign["created_at"])
    if isinstance(campaign.get("updated_at"), str):
        campaign["updated_at"] = datetime.fromisoformat(campaign["updated_at"])
    
    return Campaign(**campaign)

@api_router.get("/campaigns/{campaign_id}/uptake")
async def get_campaign_uptake(campaign_id: str, current_user: User = Depends(get_current_user)):
    """Read-only summary of client uptake for a campaign."""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    total_clients = await db.clients.count_documents({})
    elections = await db.elections.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(100000)
    opt_in = sum(1 for e in elections if e.get("decision") == "opt_in")
    opt_out = sum(1 for e in elections if e.get("decision") == "opt_out")
    decided = opt_in + opt_out
    not_elected = max(total_clients - decided, 0)

    return {
        "campaign_id": campaign_id,
        "total_clients": total_clients,
        "opt_in": opt_in,
        "opt_out": opt_out,
        "not_elected": not_elected,
    }

@api_router.get("/campaigns/{campaign_id}/export/{decision_type}")
async def export_campaign_decisions(campaign_id: str, decision_type: str, current_user: User = Depends(get_current_user)):
    """Download an Excel export of a campaign's decisions.
    decision_type: opt_in | opt_out | both
    """
    if decision_type not in {"opt_in", "opt_out", "both"}:
        raise HTTPException(status_code=400, detail="Invalid export type")

    # Only Campaign Managers and Admins/Superusers may export decision data
    if not (is_admin_or_superuser(current_user) or is_campaign_manager(current_user)):
        raise HTTPException(status_code=403, detail="You do not have permission to export campaign decisions")

    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    wanted = {"opt_in", "opt_out"} if decision_type == "both" else {decision_type}
    elections = await db.elections.find(
        {"campaign_id": campaign_id, "decision": {"$in": list(wanted)}}, {"_id": 0}
    ).to_list(100000)

    # Build lookup maps for client and user names
    clients = await db.clients.find({}, {"_id": 0, "id": 1, "client_name": 1, "policy_id": 1, "platform": 1}).to_list(100000)
    client_map = {c["id"]: c for c in clients}
    users = await db.users.find({}, {"_id": 0, "id": 1, "full_name": 1}).to_list(100000)
    user_map = {u["id"]: u.get("full_name", "") for u in users}

    decision_labels = {"opt_in": "Opt-in", "opt_out": "Opt-out"}

    wb = Workbook()
    ws = wb.active
    ws.title = "Decisions"
    ws.append(["Client Name", "Policy ID", "Platform", "Decision", "Updated By", "Updated At"])

    # Sort by client name for readability
    def sort_key(e):
        c = client_map.get(e.get("client_id"), {})
        return (c.get("client_name") or "").lower()

    for e in sorted(elections, key=sort_key):
        c = client_map.get(e.get("client_id"), {})
        ws.append([
            c.get("client_name", "Unknown"),
            c.get("policy_id", ""),
            c.get("platform", ""),
            decision_labels.get(e.get("decision"), e.get("decision")),
            user_map.get(e.get("updated_by"), ""),
            e.get("updated_at", ""),
        ])

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    safe_name = "".join(ch for ch in campaign.get("campaign_name", "campaign") if ch.isalnum() or ch in (" ", "-", "_")).strip().replace(" ", "_")
    filename = f"{safe_name}_{decision_type}.xlsx"

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@api_router.put("/campaigns/{campaign_id}", response_model=Campaign)
async def update_campaign(
    campaign_id: str,
    campaign_data: CampaignUpdate,
    current_user: User = Depends(get_current_user)
):
    if not is_admin_or_superuser(current_user):
        raise HTTPException(status_code=403, detail="Only administrators and superusers can update campaigns")
    
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Track changes for audit log
    changes = {}
    update_data = {k: v for k, v in campaign_data.model_dump().items() if v is not None}
    
    for key, new_value in update_data.items():
        old_value = campaign.get(key)
        if old_value != new_value:
            changes[key] = {"old": old_value, "new": new_value}
    
    # Only update and log if there are changes
    if changes:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.campaigns.update_one({"id": campaign_id}, {"$set": update_data})
        
        # Log the activity
        await log_activity(
            entity_type="campaign",
            entity_id=campaign_id,
            entity_name=campaign.get("campaign_name", "Unknown"),
            action="updated",
            user_id=current_user.id,
            user_name=current_user.full_name,
            changes=changes,
            client_id=campaign.get("client_id")
        )
    
    updated_campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    
    if isinstance(updated_campaign.get("created_at"), str):
        updated_campaign["created_at"] = datetime.fromisoformat(updated_campaign["created_at"])
    if isinstance(updated_campaign.get("updated_at"), str):
        updated_campaign["updated_at"] = datetime.fromisoformat(updated_campaign["updated_at"])
    
    return Campaign(**updated_campaign)

@api_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, current_user: User = Depends(get_current_user)):
    if not is_admin_or_superuser(current_user):
        raise HTTPException(status_code=403, detail="Only administrators and superusers can delete campaigns")
    
    result = await db.campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"message": "Campaign deleted successfully"}

@api_router.get("/clients/{client_id}/elections")
async def get_client_elections(client_id: str, current_user: User = Depends(get_current_user)):
    """Return every (global) campaign with this client's opt-in/opt-out decision."""
    if is_campaign_manager(current_user):
        raise HTTPException(status_code=403, detail="Campaign Managers do not have access to clients")

    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    campaigns = await db.campaigns.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    elections = await db.elections.find({"client_id": client_id}, {"_id": 0}).to_list(100000)
    decision_by_campaign = {e["campaign_id"]: e.get("decision", "not_elected") for e in elections}

    # Whether the current user may change decisions for this client
    can_edit = is_admin_or_superuser(current_user) or (
        is_client_manager(current_user) and current_user.id in client.get("client_managers", [])
    )

    result = []
    for c in campaigns:
        result.append({
            "campaign_id": c["id"],
            "campaign_name": c.get("campaign_name"),
            "channel": c.get("channel"),
            "election_start_date": c.get("election_start_date"),
            "election_end_date": c.get("election_end_date"),
            "campaign_products": c.get("campaign_products", []),
            "decision": decision_by_campaign.get(c["id"], "not_elected"),
        })

    return {"can_edit": can_edit, "elections": result}

@api_router.put("/clients/{client_id}/campaigns/{campaign_id}/election")
async def set_client_election(
    client_id: str,
    campaign_id: str,
    payload: ElectionUpdate,
    current_user: User = Depends(get_current_user)
):
    if payload.decision not in ELECTION_DECISIONS:
        raise HTTPException(status_code=400, detail="Invalid decision")

    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    can_edit = is_admin_or_superuser(current_user) or (
        is_client_manager(current_user) and current_user.id in client.get("client_managers", [])
    )
    if not can_edit:
        raise HTTPException(status_code=403, detail="You do not have permission to set this election")

    existing = await db.elections.find_one({"client_id": client_id, "campaign_id": campaign_id}, {"_id": 0})
    old_decision = existing.get("decision", "not_elected") if existing else "not_elected"

    now = datetime.now(timezone.utc).isoformat()
    await db.elections.update_one(
        {"client_id": client_id, "campaign_id": campaign_id},
        {"$set": {
            "client_id": client_id,
            "campaign_id": campaign_id,
            "decision": payload.decision,
            "updated_by": current_user.id,
            "updated_at": now,
        }},
        upsert=True
    )

    # Audit log on the client timeline
    await log_activity(
        entity_type="election",
        entity_id=campaign_id,
        entity_name=campaign.get("campaign_name", "Unknown"),
        action="updated",
        user_id=current_user.id,
        user_name=current_user.full_name,
        changes={"decision": {"old": old_decision, "new": payload.decision}},
        client_id=client_id,
    )

    return {"client_id": client_id, "campaign_id": campaign_id, "decision": payload.decision}

# Health check
@api_router.get("/")
async def root():
    return {"message": "Marketing Campaign Decision Tracking API"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
