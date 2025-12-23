import traceback
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path

from typing import Literal, Optional
from services.jobsglobal import fetch_jobs_by_group_id
from services.job_groups import get_job_groups, get_summary_stats
from services.mapper import map_api_response_to_job, map_api_responses_to_jobs
from services.supabase_client import upsert_job, upsert_jobs
from services.embedding_service import rebuild_embeddings_for_jobs, reindex_all_embeddings

# Load .env from project root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

SECRET_EMBEDDING_CODE = os.getenv("SECRET_EMBEDDING_CODE", "")

app = FastAPI(
    title="Job List Update API",
    description="API to sync jobs from JobsGlobal to Supabase",
    version="1.0.0"
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SyncJobsRequest(BaseModel):
    job_group_id: str
    status: Literal["Open", "Close"] = "Open"


class SyncJobsResponse(BaseModel):
    success: bool
    message: str
    rows_affected: int
    jobs: list[dict]
    embeddings_updated: int = 0


@app.get("/")
async def root():
    return {"message": "Job List Update API is running"}


@app.post("/api/sync-jobs", response_model=SyncJobsResponse)
async def sync_jobs(request: SyncJobsRequest):
    """
    Fetches jobs from JobsGlobal API by job_group_id and upserts to Supabase.
    """
    try:
        # Fetch from JobsGlobal API
        api_response = await fetch_jobs_by_group_id(request.job_group_id)
        
        # Handle both single job and list of jobs response
        if isinstance(api_response, list):
            # Multiple jobs returned
            mapped_jobs = map_api_responses_to_jobs(api_response, request.status)
            upserted_jobs = upsert_jobs(mapped_jobs)
        elif isinstance(api_response, dict) and "job" in api_response:
            # Single job returned
            mapped_job = map_api_response_to_job(api_response, request.status)
            upserted_job = upsert_job(mapped_job)
            upserted_jobs = [upserted_job] if upserted_job else []
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid API response format"
            )
        
        # Rebuild embeddings only when status is "Open"
        embeddings_updated = 0
        if request.status == "Open" and upserted_jobs:
            job_ids = [job.get("id") for job in upserted_jobs if job.get("id")]
            if job_ids:
                embeddings_updated = rebuild_embeddings_for_jobs(job_ids)
        
        return SyncJobsResponse(
            success=True,
            message=f"Successfully synced {len(upserted_jobs)} job(s)",
            rows_affected=len(upserted_jobs),
            jobs=upserted_jobs,
            embeddings_updated=embeddings_updated
        )
        
    except Exception as e:
        print("=" * 50)
        print("ERROR IN sync_jobs:")
        traceback.print_exc()
        print("=" * 50)
        raise HTTPException(
            status_code=500,
            detail=f"Error syncing jobs: {str(e)}"
        )


@app.get("/api/job-groups")
async def list_job_groups(
    status: Optional[str] = None,
    sort_by: Literal["date_created", "status"] = "date_created",
    sort_order: Literal["asc", "desc"] = "desc",
    search: Optional[str] = None
):
    """
    Fetches unique job groups with their status from Supabase.
    Supports filtering by status, searching by job_group_id, and sorting.
    """
    try:
        job_groups = get_job_groups(
            status_filter=status,
            sort_by=sort_by,
            sort_order=sort_order,
            search=search
        )
        return {
            "success": True,
            "job_groups": job_groups,
            "total": len(job_groups)
        }
    except Exception as e:
        print("=" * 50)
        print("ERROR IN list_job_groups:")
        traceback.print_exc()
        print("=" * 50)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching job groups: {str(e)}"
        )


@app.get("/api/stats")
async def get_stats():
    """
    Returns summary statistics for jobs and trips.
    """
    try:
        stats = get_summary_stats()
        return {
            "success": True,
            **stats
        }
    except Exception as e:
        print("=" * 50)
        print("ERROR IN get_stats:")
        traceback.print_exc()
        print("=" * 50)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching stats: {str(e)}"
        )


class ReindexRequest(BaseModel):
    secret_code: str
    job_group_id: Optional[str] = None  # If empty, reindex all; otherwise reindex only this job_group_id


class ReindexResponse(BaseModel):
    success: bool
    message: str
    total_processed: int
    total_jobs: int
    job_group_id: Optional[str] = None


@app.post("/api/reindex-all", response_model=ReindexResponse)
async def reindex_all_embeddings_endpoint(request: ReindexRequest):
    """
    Reindexes embeddings in the database.
    If job_group_id is provided, only reindex that job group.
    If job_group_id is empty/None, reindex all embeddings.
    Protected by SECRET_EMBEDDING_CODE.
    """
    # Validate secret code
    if not SECRET_EMBEDDING_CODE:
        raise HTTPException(
            status_code=500,
            detail="SECRET_EMBEDDING_CODE not configured on server"
        )
    
    if request.secret_code != SECRET_EMBEDDING_CODE:
        raise HTTPException(
            status_code=403,
            detail="Invalid secret code"
        )
    
    try:
        # Run sync function in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        # Pass job_group_id to the reindex function
        result = await loop.run_in_executor(
            None, 
            lambda: reindex_all_embeddings(job_group_id=request.job_group_id)
        )
        
        # Build appropriate message
        if result.get("job_group_id"):
            message = f"Successfully reindexed {result['total_processed']} out of {result['total_jobs']} jobs for job_group_id '{result['job_group_id']}'"
        else:
            message = f"Successfully reindexed {result['total_processed']} out of {result['total_jobs']} jobs"
        
        return ReindexResponse(
            success=True,
            message=message,
            total_processed=result["total_processed"],
            total_jobs=result["total_jobs"],
            job_group_id=result.get("job_group_id")
        )
    except Exception as e:
        print("=" * 50)
        print("ERROR IN reindex_all_embeddings_endpoint:")
        traceback.print_exc()
        print("=" * 50)
        raise HTTPException(
            status_code=500,
            detail=f"Error reindexing embeddings: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

