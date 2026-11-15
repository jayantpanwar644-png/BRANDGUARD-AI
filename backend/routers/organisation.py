import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.config import settings
from backend.core.deps import get_current_user, get_current_organisation
from backend.models.all_models import User, Organisation, BrandProfile, BrandAsset, ActivityLog
from backend.services.logo_processor import logo_processor

router = APIRouter(prefix="/organisations", tags=["Organisation"])

@router.get("/current")
def get_current_org_details(
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    brand = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    return {
        "organisation": org,
        "brand_profile": brand
    }

@router.put("/current")
def update_organisation(
    name: str = Form(None),
    industry: str = Form(None),
    website: str = Form(None),
    contact_info: str = Form(None),
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    if name:
        org.name = name
    if industry:
        org.industry = industry
    if website:
        org.website = website
    if contact_info:
        org.contact_info = contact_info

    # Update brand profile name
    brand = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    if brand and name:
        brand.company_name = name

    db.commit()
    db.refresh(org)
    return {"message": "Organisation updated successfully.", "organisation": org}

@router.post("/logo")
async def upload_company_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    org: Organisation = Depends(get_current_organisation),
    db: Session = Depends(get_db)
):
    is_valid, ext, category_or_msg = logo_processor.validate_file_format(file.filename)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=category_or_msg
        )

    content_bytes = await file.read()
    if len(content_bytes) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE_BYTES / (1024*1024)}MB."
        )

    if category_or_msg == "document":
        doc_result = logo_processor.extract_candidates_from_document(content_bytes, file.filename, org.id)
        if not doc_result.get("candidates"):
            raise HTTPException(status_code=400, detail="No embedded logo or image found in uploaded document.")
        cand = doc_result["candidates"][0]
        proc_result = logo_processor.confirm_logo_candidate(cand["preview_url"], file.filename, org.id)
        orig_path = doc_result["original_path"]
        raster_path = proc_result["raster_path"]
        local_raster = proc_result["local_raster_dest"]
        file_size = cand["file_size"]
        w = cand["width"]
        h = cand["height"]
        has_alpha = cand["characteristics"]["has_transparency"]
    else:
        proc_result = logo_processor.process_direct_image(content_bytes, file.filename, org.id)
        orig_path = proc_result["original_path"]
        raster_path = proc_result["raster_path"]
        local_raster = proc_result["local_raster_dest"]
        file_size = proc_result["file_size"]
        w = proc_result["characteristics"]["width"]
        h = proc_result["characteristics"]["height"]
        has_alpha = proc_result["characteristics"]["has_transparency"]

    # Demote existing primary logos
    db.query(BrandAsset).filter(
        BrandAsset.organisation_id == org.id,
        BrandAsset.is_primary == True
    ).update({"is_primary": False})

    file_url = raster_path or orig_path
    org.logo_url = file_url
    
    brand = db.query(BrandProfile).filter(BrandProfile.organisation_id == org.id).first()
    if brand:
        brand.logo_path = str(local_raster)
        brand.is_configured = True
    
    # Register as Brand Asset
    asset = BrandAsset(
        organisation_id=org.id,
        asset_type="Primary Logo",
        variation_type="Primary Logo",
        file_name=file.filename,
        file_path=orig_path,
        raster_path=raster_path,
        source_format=ext.replace('.', '').upper(),
        file_size=file_size,
        width=w,
        height=h,
        has_transparency=has_alpha,
        description="Official Primary Company Logo",
        is_primary=True
    )
    db.add(asset)

    # Log activity
    log = ActivityLog(
        organisation_id=org.id,
        user_id=current_user.id,
        user_email=current_user.email,
        action_type="UPLOAD_LOGO",
        entity_type="BrandAsset",
        description=f"Uploaded official primary logo '{file.filename}' ({ext.replace('.', '').upper()})."
    )
    db.add(log)
    db.commit()
    db.refresh(asset)

    return {
        "message": "Company logo uploaded and verified successfully.",
        "logo_url": file_url,
        "asset": {
            "id": asset.id,
            "file_name": asset.file_name,
            "raster_path": asset.raster_path,
            "file_path": asset.file_path,
            "source_format": asset.source_format,
            "variation_type": asset.variation_type,
            "width": asset.width,
            "height": asset.height
        }
    }
