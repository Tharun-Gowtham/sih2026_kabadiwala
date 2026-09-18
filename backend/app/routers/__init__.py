from app.routers.auth import router as auth_router
from app.routers.purchases import router as purchases_router
from app.routers.stock import router as stock_router
from app.routers.lots import router as lots_router
from app.routers.qr import router as qr_router
from app.routers.recyclers import router as recyclers_router
from app.routers.handover import router as handover_router
from app.routers.ledger import router as ledger_router
from app.routers.records import router as records_router
from app.routers.batches import router as batches_router

__all__ = [
    "auth_router",
    "purchases_router",
    "stock_router",
    "lots_router",
    "qr_router",
    "recyclers_router",
    "handover_router",
    "ledger_router",
    "records_router",
    "batches_router",
]
