import json
import os
from datetime import datetime
from pathlib import Path

# Load lookup files
DATA_DIR = Path(__file__).parent.parent / "data"

def load_lookup(filename: str) -> dict:
    """Load a JSON lookup file."""
    filepath = DATA_DIR / filename
    if filepath.exists():
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

INDUSTRIES = load_lookup("industries.json")
DESTINATIONS = load_lookup("destinations.json")

DEFAULT_IMAGE = "https://jobsglobal.com/lv/i/ap1.png"


def parse_ids_string(ids_string: str | None) -> list[str]:
    """
    Parse an IDs string like '[688, 123]' or '[688]' into a list of string IDs.
    """
    if not ids_string:
        return []
    try:
        # Remove brackets and parse as JSON
        ids = json.loads(ids_string)
        return [str(id) for id in ids]
    except (json.JSONDecodeError, TypeError):
        return []


def get_category_from_ids(industry_ids: str | None) -> str | None:
    """
    Maps industry IDs to category names (concatenated if multiple).
    """
    ids = parse_ids_string(industry_ids)
    if not ids:
        return None
    
    categories = [INDUSTRIES.get(id) for id in ids if INDUSTRIES.get(id)]
    return ", ".join(categories) if categories else None


def get_country_from_ids(destination_ids: str | None) -> str | None:
    """
    Maps destination IDs to country name (first match).
    """
    ids = parse_ids_string(destination_ids)
    if not ids:
        return None
    
    for id in ids:
        if id in DESTINATIONS:
            return DESTINATIONS[id]
    return None


def parse_date(date_string: str | None) -> str | None:
    """
    Parses a datetime string like '2025-11-25 23:10:29' to a date string 'YYYY-MM-DD'.
    """
    if not date_string:
        return None
    try:
        dt = datetime.strptime(date_string, "%Y-%m-%d %H:%M:%S")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return None


def map_api_response_to_job(api_response: dict) -> dict:
    """
    Maps a single API response to the Supabase job_list schema.
    """
    job = api_response.get("job", {})
    
    # Extract mapped fields
    job_group_id = job.get("job_group_id")
    job_post_id = job.get("job_post_id")
    job_title = api_response.get("title")
    email = api_response.get("email")
    apply_link = api_response.get("link")
    image_link = job.get("cover_photo") or DEFAULT_IMAGE
    category = get_category_from_ids(job.get("industry_ids"))
    country = get_country_from_ids(job.get("job_destinations"))
    job_description = job.get("job_description")
    status = job.get("status")
    date_created = parse_date(job.get("date_created"))
    
    # Build metadata JSON
    metadata = {
        "email": email,
        "status": status,
        "country": country,
        "category": category,
        "imageUrl": image_link,
        "applyLink": apply_link,
        "job_title": job_title
    }
    
    return {
        "job_group_id": job_group_id,
        "job_post_id": job_post_id,
        "job_title": job_title,
        "email": email,
        "apply_link": apply_link,
        "image_link": image_link,
        "category": category,
        "country": country,
        "job_description": job_description,
        "status": status,
        "date_created": date_created,
        "metadata": metadata
    }


def map_api_responses_to_jobs(api_responses: list[dict]) -> list[dict]:
    """
    Maps a list of API responses to Supabase job_list schema records.
    """
    return [map_api_response_to_job(response) for response in api_responses]
