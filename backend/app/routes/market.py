from fastapi import APIRouter

from app.services.voice_service import MARKET_PRICES

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/prices")
async def get_prices():
    """
    Return the full mock market price table for all tracked crops and cities.
    Shape: { crop: { city: { price: int, unit: str } } }
    """
    return {"prices": MARKET_PRICES}
