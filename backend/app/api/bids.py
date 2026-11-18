
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.bid import BidCreate, BidResponse
from app.schemas.bid_history import BidHistoryResponse
from app.services.bid_history_service import get_rfq_bid_history
from app.services.rfq_service import get_rfq_by_id
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



@router.get(
    "/{rfq_id}/bids",
    response_model=list[BidHistoryResponse],
)
def get_rfq_bid_history_endpoint(
    rfq_id: int,
    db: Session = Depends(get_db),
):
    """Return the complete bid history for an RFQ."""

    if get_rfq_by_id(db, rfq_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RFQ not found",
        )

    return get_rfq_bid_history(db, rfq_id)
