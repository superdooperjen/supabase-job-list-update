import traceback
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from services.jobsglobal import fetch_jobs_by_group_id
from services.mapper import map_api_response_to_job, map_api_responses_to_jobs
from services.supabase_client import upsert_job, upsert_jobs

load_dotenv()

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


class SyncJobsResponse(BaseModel):
    success: bool
    message: str
    rows_affected: int
    jobs: list[dict]


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
            mapped_jobs = map_api_responses_to_jobs(api_response)
            upserted_jobs = upsert_jobs(mapped_jobs)
        elif isinstance(api_response, dict) and "job" in api_response:
            # Single job returned
            mapped_job = map_api_response_to_job(api_response)
            upserted_job = upsert_job(mapped_job)
            upserted_jobs = [upserted_job] if upserted_job else []
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid API response format"
            )
        
        return SyncJobsResponse(
            success=True,
            message=f"Successfully synced {len(upserted_jobs)} job(s)",
            rows_affected=len(upserted_jobs),
            jobs=upserted_jobs
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
