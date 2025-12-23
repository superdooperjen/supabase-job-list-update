"""
Service to handle job details queries from Supabase for modal display.
"""
from typing import Optional
from services.supabase_client import get_supabase_client


def get_jobs_by_group_id(job_group_id: str) -> list[dict]:
    """
    Fetches all jobs for a specific job_group_id from Supabase.
    Returns jobs with fields needed for modal display.
    """
    client = get_supabase_client()
    
    result = client.table("job_list").select(
        "id, job_group_id, job_post_id, job_title, email, category, country, status, date_created"
    ).eq("job_group_id", job_group_id).order(
        "date_created", desc=True
    ).execute()
    
    return result.data if result.data else []
