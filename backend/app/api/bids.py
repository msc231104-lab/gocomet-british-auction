
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.bid import BidCreate, BidResponse
from app.services.bid_service import (
    BidValidationError,
    RFQNotFoundError,
    SupplierNotFoundError,
    submit_bid,
)

router = APIRouter(
    prefix="/rfqs",
    tags=["Bids"],
)


@router.post(
    "/{rfq_id}/bids",
    response_model=BidResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_bid_endpoint(
    rfq_id: int,
    payload: BidCreate,
    db: Session = Depends(get_db),
):
    """Submit a supplier bid for an active RFQ."""

    try:
        return submit_bid(db, rfq_id, payload)

    except RFQNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except SupplierNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except BidValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
