from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.deps import get_current_user, get_current_organisation
from backend.models.all_models import Organisation, User, ChatConversation, ChatMessage
from backend.schemas.all_schemas import (
    ChatMessageCreate, ChatMessageResponse,
    ChatConversationCreate, ChatConversationUpdate, ChatConversationResponse, ChatConversationSummary,
    PagePromptSuggestion, QuickSuggestRequest,
    ExecuteActionRequest, ExecuteActionResponse
)
from backend.services.chat_assistant import (
    generate_assistant_response, get_page_suggested_prompts, execute_copilot_action
)

router = APIRouter(prefix="/chat", tags=["AI Assistant & Copilot"])

def utc_now():
    return datetime.now(timezone.utc)

# ─────────────────────────────────────────────────────────────────────────────
# 1. CONVERSATION MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/conversations", response_model=List[ChatConversationSummary])
def list_conversations(
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """List conversation threads for the current user and organisation."""
    conversations = (
        db.query(ChatConversation)
        .filter(
            ChatConversation.organisation_id == org.id,
            ChatConversation.user_id == current_user.id
        )
        .order_by(ChatConversation.updated_at.desc())
        .all()
    )
    
    result = []
    for c in conversations:
        result.append(ChatConversationSummary(
            id=c.id,
            title=c.title,
            mode=c.mode,
            context_page=c.context_page,
            updated_at=c.updated_at,
            message_count=len(c.messages)
        ))
    return result


@router.post("/conversations", response_model=ChatConversationResponse)
def create_conversation(
    req: ChatConversationCreate,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Create a new chat conversation thread."""
    conv = ChatConversation(
        organisation_id=org.id,
        user_id=current_user.id,
        title=req.title or "New Conversation",
        mode=req.mode or "copilot",
        context_page=req.context_page or "overview",
        created_at=utc_now(),
        updated_at=utc_now()
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    # Initial Welcome Message
    if conv.mode == "copilot":
        welcome_content = (
            f"Hello {current_user.full_name}! 👋 I am your **BrandGuard AI Copilot**.\n\n"
            f"I have live access to **{org.name}**'s brand guidelines, active audits, "
            f"approved claims, official logos, and audience sentiment.\n\n"
            f"How can I assist your brand governance workflow today?"
        )
    else:
        welcome_content = (
            f"Hello {current_user.full_name}! 🚀 I am your **General AI Creative Assistant**.\n\n"
            f"Ask me anything about digital advertising, social media strategies, campaign ideation, "
            f"or creative copywriting."
        )

    initial_msg = ChatMessage(
        conversation_id=conv.id,
        role="assistant",
        content=welcome_content,
        created_at=utc_now()
    )
    db.add(initial_msg)
    db.commit()
    db.refresh(conv)

    return conv


@router.get("/conversations/{id}", response_model=ChatConversationResponse)
def get_conversation_detail(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Get full conversation detail including complete message history."""
    conv = db.query(ChatConversation).filter(
        ChatConversation.id == id,
        ChatConversation.organisation_id == org.id,
        ChatConversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation thread not found.")
    return conv


@router.patch("/conversations/{id}", response_model=ChatConversationResponse)
def update_conversation(
    id: int,
    req: ChatConversationUpdate,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Rename a conversation thread."""
    conv = db.query(ChatConversation).filter(
        ChatConversation.id == id,
        ChatConversation.organisation_id == org.id,
        ChatConversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation thread not found.")

    if req.title:
        conv.title = req.title.strip()
    conv.updated_at = utc_now()
    db.commit()
    db.refresh(conv)
    return conv


@router.delete("/conversations/{id}")
def delete_conversation(
    id: int,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Delete a conversation thread."""
    conv = db.query(ChatConversation).filter(
        ChatConversation.id == id,
        ChatConversation.organisation_id == org.id,
        ChatConversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation thread not found.")

    db.delete(conv)
    db.commit()
    return {"message": "Conversation thread deleted successfully."}


# ─────────────────────────────────────────────────────────────────────────────
# 2. MESSAGING & AI INTERACTION
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/conversations/{id}/messages", response_model=ChatMessageResponse)
def send_chat_message(
    id: int,
    req: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Send a user message to the conversation and receive the AI Copilot response."""
    conv = db.query(ChatConversation).filter(
        ChatConversation.id == id,
        ChatConversation.organisation_id == org.id,
        ChatConversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation thread not found.")

    # 1. Save user message
    user_msg = ChatMessage(
        conversation_id=conv.id,
        role="user",
        content=req.content.strip(),
        created_at=utc_now()
    )
    db.add(user_msg)
    db.flush()

    # Automatically set title from first user query if default title
    if conv.title == "New Conversation" and len(conv.messages) <= 2:
        clean_title = req.content.strip().split("\n")[0][:40]
        if clean_title:
            conv.title = clean_title

    # 2. Collect recent history
    history = []
    for m in conv.messages[-8:]:
        history.append({"role": m.role, "content": m.content})

    # 3. Determine active mode & page context
    active_mode = req.mode or conv.mode or "copilot"
    active_page = req.context_page or conv.context_page or "overview"

    # 4. Generate AI response
    ai_output = generate_assistant_response(
        query=req.content,
        mode=active_mode,
        org_id=org.id,
        user_id=current_user.id,
        db=db,
        context_page=active_page,
        content_id=req.content_id,
        history=history
    )

    # 5. Save assistant reply
    assistant_msg = ChatMessage(
        conversation_id=conv.id,
        role="assistant",
        content=ai_output.get("content", "I am reviewing your request."),
        sources=ai_output.get("sources", []),
        suggested_actions=ai_output.get("suggested_actions", []),
        created_at=utc_now()
    )
    db.add(assistant_msg)
    conv.updated_at = utc_now()
    db.commit()
    db.refresh(assistant_msg)

    return assistant_msg


# ─────────────────────────────────────────────────────────────────────────────
# 3. CONTEXT SUGGESTIONS & ACTIONS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/quick-suggest", response_model=List[PagePromptSuggestion])
def get_quick_suggestions(
    req: QuickSuggestRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Retrieve dynamic prompt chips for the current page context."""
    prompts = get_page_suggested_prompts(req.context_page, org.id, db)
    return [PagePromptSuggestion(**p) for p in prompts]


@router.post("/execute-action", response_model=ExecuteActionResponse)
def execute_action(
    req: ExecuteActionRequest,
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    """Execute a Copilot-suggested action (e.g. trigger AI creative revision)."""
    try:
        res = execute_copilot_action(
            action_type=req.action_type,
            content_id=req.content_id,
            parameters=req.parameters,
            org_id=org.id,
            user_id=current_user.id,
            user_email=current_user.email,
            db=db
        )
        return ExecuteActionResponse(
            success=True,
            message=res.get("message", "Action executed successfully."),
            action_type=req.action_type,
            result=res.get("result")
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
