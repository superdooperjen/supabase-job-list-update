import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    """
    Returns a singleton Supabase client instance.
    """
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client


def upsert_job(job_data: dict) -> dict:
    """
    Upserts a job record to the job_list table.
    Uses job_post_id as the unique identifier for upsert.
    Returns the upserted record.
    """
    client = get_supabase_client()
    
    # Upsert using job_post_id as the conflict column
    result = client.table("job_list").upsert(
        job_data,
        on_conflict="job_post_id"
    ).execute()
    
    return result.data[0] if result.data else {}


def upsert_jobs(jobs_data: list[dict]) -> list[dict]:
    """
    Upserts multiple job records to the job_list table.
    Uses job_post_id as the unique identifier for upsert.
    Returns the list of upserted records.
    """
    client = get_supabase_client()
    
    # Upsert using job_post_id as the conflict column
    result = client.table("job_list").upsert(
        jobs_data,
        on_conflict="job_post_id"
    ).execute()
    
    return result.data if result.data else []

