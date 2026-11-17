
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.supplier import SupplierCreate, SupplierResponse
from app.services.supplier_service import (
    create_supplier,
    list_suppliers,
)

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.post(
    "",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_supplier_endpoint(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
):
    """Register a new supplier."""

    return create_supplier(db, payload)


@router.get(
    "",
    response_model=list[SupplierResponse],
)
def list_suppliers_endpoint(
    db: Session = Depends(get_db),
):
    """Retrieve all registered suppliers."""

    return list_suppliers(db)
