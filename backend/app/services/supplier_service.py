
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate


def create_supplier(
    db: Session,
    payload: SupplierCreate,
) -> Supplier:
    """Register a new supplier."""

    supplier = Supplier(name=payload.name)

    try:
        db.add(supplier)
        db.commit()
        db.refresh(supplier)
    except Exception:
        db.rollback()
        raise

    return supplier


def list_suppliers(db: Session) -> list[Supplier]:
    """Retrieve registered suppliers."""

    statement = select(Supplier).order_by(
        Supplier.created_at.desc(),
        Supplier.id.desc(),
    )

    return list(db.scalars(statement).all())
