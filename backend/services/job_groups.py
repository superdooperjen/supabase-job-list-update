"""
Service to handle job group queries from Supabase.
"""
from typing import Optional, Literal
from services.supabase_client import get_supabase_client


def get_job_groups(
    status_filter: Optional[str] = None,
    sort_by: Literal["date_created", "status"] = "date_created",
    sort_order: Literal["asc", "desc"] = "desc",
    search: Optional[str] = None
) -> list[dict]:
    """
    Fetches unique job_group_id with their status and date_created from Supabase.
    Groups by job_group_id and returns the latest entry for each group.
    Supports filtering by status, searching by job_group_id, and sorting.
    """
    client = get_supabase_client()
    
    # Build query - select distinct job_group_id with status and dates
    query = client.table("job_list").select(
        "job_group_id, status, date_created"
    )
    
    # Apply status filter if provided
    if status_filter and status_filter in ["Open", "Close"]:
        query = query.eq("status", status_filter)
    
    # Apply search filter for job_group_id if provided
    if search and search.strip():
        query = query.ilike("job_group_id", f"%{search.strip()}%")
    
    # Get all records to process
    result = query.execute()
    
    if not result.data:
        return []
    
    # Group by job_group_id and get unique entries with aggregated info
    job_groups_map = {}
    for record in result.data:
        group_id = record.get("job_group_id")
        if group_id not in job_groups_map:
            job_groups_map[group_id] = {
                "job_group_id": group_id,
                "status": record.get("status"),
                "date_created": record.get("date_created"),
                "job_count": 1
            }
        else:
            job_groups_map[group_id]["job_count"] += 1
            # Keep the most recent date_created
            if record.get("date_created") and (
                not job_groups_map[group_id]["date_created"] or
                record.get("date_created") > job_groups_map[group_id]["date_created"]
            ):
                job_groups_map[group_id]["date_created"] = record.get("date_created")
    
    # Convert to list
    job_groups = list(job_groups_map.values())
    
    # Sort the results
    reverse = sort_order == "desc"
    if sort_by == "date_created":
        job_groups.sort(
            key=lambda x: x.get("date_created") or "",
            reverse=reverse
        )
    elif sort_by == "status":
        job_groups.sort(
            key=lambda x: x.get("status") or "",
            reverse=reverse
        )
    
    return job_groups


def get_summary_stats() -> dict:
    """
    Returns summary statistics:
    - total_open_trips: Count of unique job_group_id with Open status
    - total_open_jobs: Count of individual jobs (job_post_id) with Open status
    - total_trips: Count of all unique job_group_id
    - total_jobs: Count of all jobs
    """
    client = get_supabase_client()
    
    # Get all records
    result = client.table("job_list").select(
        "job_group_id, job_post_id, status"
    ).execute()
    
    if not result.data:
        return {
            "total_open_trips": 0,
            "total_open_jobs": 0,
            "total_trips": 0,
            "total_jobs": 0
        }
    
    # Calculate stats
    all_group_ids = set()
    open_group_ids = set()
    total_jobs = 0
    open_jobs = 0
    
    for record in result.data:
        group_id = record.get("job_group_id")
        status = record.get("status")
        
        all_group_ids.add(group_id)
        total_jobs += 1
        
        if status == "Open":
            open_group_ids.add(group_id)
            open_jobs += 1
    
    return {
        "total_open_trips": len(open_group_ids),
        "total_open_jobs": open_jobs,
        "total_trips": len(all_group_ids),
        "total_jobs": total_jobs
    }
