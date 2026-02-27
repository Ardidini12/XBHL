from contextlib import asynccontextmanager
from typing import AsyncGenerator

import sentry_sdk
from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import settings
from app.services.scheduler_service import get_scheduler, load_active_schedulers


def custom_generate_unique_id(route: APIRoute) -> str:
    """
    Constructs a unique identifier for an API route by concatenating its first tag and its route name with a hyphen.
    
    Parameters:
    	route (APIRoute): The route whose first tag and name are used to build the identifier.
    
    Returns:
    	str: Identifier in the form "firstTag-routeName", e.g. "users-get_user".
    """
    return f"{route.tags[0]}-{route.name}"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage application lifespan: start the scheduler and load active schedulers on startup, then shut down the scheduler on shutdown.
    
    This async context manager is used by FastAPI to perform startup tasks (start the shared scheduler and load any active scheduled jobs) and to perform teardown (shutdown the scheduler without waiting) when the application stops.
    """
    scheduler = get_scheduler()
    scheduler.start()
    load_active_schedulers()
    yield
    scheduler.shutdown(wait=False)


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=lifespan,
)

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,  # type: ignore
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)
