
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.rfq import RFQ
from app.schemas.rfq import RFQCreate, RFQResponse
from app.services.rfq_service import (
    DuplicateRFQReferenceError,
    create_rfq,
    get_rfq_by_id,
    get_rfq_status,
    list_rfqs,
)

router = APIRouter(prefix="/rfqs", tags=["RFQs"])


def build_rfq_response(rfq: RFQ) -> RFQResponse:
    """Convert an RFQ database object into an API response."""

    return RFQResponse.model_validate({
        **{
            field: getattr(rfq, field)
            for field in RFQResponse.model_fields
            if field != "status"
        },
        "status": get_rfq_status(rfq),
    })


@router.post(
    "",
    response_model=RFQResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_rfq_endpoint(
    payload: RFQCreate,
    db: Session = Depends(get_db),
):
    try:
        rfq = create_rfq(db, payload)
    except DuplicateRFQReferenceError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return build_rfq_response(rfq)


@router.get(
    "",
    response_model=list[RFQResponse],
)
def list_rfqs_endpoint(
    db: Session = Depends(get_db),
):
    rfqs = list_rfqs(db)

    return [
        build_rfq_response(rfq)
        for rfq in rfqs
    ]


@router.get(
    "/{rfq_id}",
    response_model=RFQResponse,
)
def get_rfq_endpoint(
    rfq_id: int,
    db: Session = Depends(get_db),
):
    rfq = get_rfq_by_id(db, rfq_id)

    if rfq is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RFQ not found",
        )

    return build_rfq_response(rfq)
