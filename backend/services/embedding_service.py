"""
Embedding service for generating and rebuilding embeddings for specific jobs.
"""
import os
from typing import List, Dict, Any
from dotenv import load_dotenv
from pathlib import Path
from openai import OpenAI
from services.supabase_client import get_supabase_client

# Load .env from project root (parent of backend folder)
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY")
EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

# Initialize OpenAI client
openai_client: OpenAI = None


def _get_openai_client():
    """Lazy initialization of OpenAI client."""
    global openai_client
    if openai_client is None:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
    return openai_client


def get_embedding(text: str) -> List[float] | None:
    """Generates a vector embedding for the given text using OpenAI."""
    try:
        client = _get_openai_client()
        input_text = text.replace("\n", " ")
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=input_text
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error generating embedding for text: '{text[:50]}...' -> {e}")
        return None


def rebuild_embeddings_for_jobs(job_ids: List[int]) -> int:
    """
    Rebuilds embeddings for the specified job IDs.
    
    Args:
        job_ids: List of job IDs to rebuild embeddings for
        
    Returns:
        Number of embeddings successfully updated
    """
    if not job_ids:
        return 0
    
    db = get_supabase_client()
    
    # Fetch job data for the specified IDs
    response = db.table("job_list").select(
        "id, job_title, job_description, status, country, category"
    ).in_("id", job_ids).execute()
    
    jobs: List[Dict[str, Any]] = response.data
    
    if not jobs:
        print(f"No jobs found for IDs: {job_ids}")
        return 0
    
    print(f"Rebuilding embeddings for {len(jobs)} jobs...")
    
    updated_count = 0
    
    for job in jobs:
        job_id = job.get("id")
        title = job.get("job_title")
        description = job.get("job_description")
        status = job.get("status")
        country = job.get("country")
        category = job.get("category")
        
        if not title and not description:
            print(f"Warning: Job ID {job_id} has no title or description. Skipping.")
            continue
        
        # Create the content to embed
        content_to_embed = f"Title: {title}. Description: {description}. Status: {status}. Country: {country}. Category: {category}"
        
        embedding_vector = get_embedding(content_to_embed)
        
        if embedding_vector:
            try:
                db.table("job_list").update({
                    "embedding": embedding_vector
                }).eq("id", job_id).execute()
                updated_count += 1
                print(f"Updated embedding for job ID: {job_id}")
            except Exception as e:
                print(f"Error updating embedding for job ID {job_id}: {e}")
        else:
            print(f"Failed to generate embedding for job ID: {job_id}")
    
    print(f"Successfully rebuilt {updated_count} embeddings")
    return updated_count


def reindex_all_embeddings(batch_size: int = 50) -> dict:
    """
    Rebuilds embeddings for ALL jobs in the database.
    Processes in batches to avoid memory issues.
    
    Args:
        batch_size: Number of jobs to process in each batch
        
    Returns:
        Dict with total_processed and total_jobs counts
    """
    db = get_supabase_client()
    
    # Get total count first
    count_response = db.table("job_list").select("id", count="exact").execute()
    total_jobs = count_response.count or 0
    
    print(f"Starting full reindex of {total_jobs} jobs with batch size {batch_size}...")
    
    total_processed = 0
    offset = 0
    
    while True:
        # Fetch batch of jobs
        response = db.table("job_list").select(
            "id, job_title, job_description, status, country, category"
        ).range(offset, offset + batch_size - 1).execute()
        
        jobs = response.data
        
        if not jobs:
            break
        
        print(f"Processing batch: {offset} to {offset + len(jobs)}...")
        
        for job in jobs:
            job_id = job.get("id")
            title = job.get("job_title")
            description = job.get("job_description")
            status = job.get("status")
            country = job.get("country")
            category = job.get("category")
            
            if not title and not description:
                print(f"Warning: Job ID {job_id} has no title or description. Skipping.")
                continue
            
            content_to_embed = f"Title: {title}. Description: {description}. Status: {status}. Country: {country}. Category: {category}"
            
            embedding_vector = get_embedding(content_to_embed)
            
            if embedding_vector:
                try:
                    db.table("job_list").update({
                        "embedding": embedding_vector
                    }).eq("id", job_id).execute()
                    total_processed += 1
                except Exception as e:
                    print(f"Error updating embedding for job ID {job_id}: {e}")
        
        offset += batch_size
        
        # Break if we've processed all jobs
        if offset >= total_jobs:
            break
    
    print(f"Full reindex complete: {total_processed}/{total_jobs} embeddings updated")
    
    return {
        "total_processed": total_processed,
        "total_jobs": total_jobs
    }
