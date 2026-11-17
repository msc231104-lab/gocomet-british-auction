from fastapi import FastAPI

app = FastAPI(
    title="GoComet British Auction API",
    version="1.0.0",
    description="Backend API for the RFQ reverse auction system.",
)


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "gocomet-auction-api",
    }