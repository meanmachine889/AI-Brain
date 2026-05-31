from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, clients, integrations, summaries

app = FastAPI(title="Agency AI Brain", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # the Next.js frontend (later)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(clients.router, prefix="/clients", tags=["clients"])
app.include_router(integrations.router, prefix="/integrations", tags=["integrations"])
app.include_router(summaries.router, tags=["summaries"])


@app.get("/health")
def health():
    return {"status": "ok"}
