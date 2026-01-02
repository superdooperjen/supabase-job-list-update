import httpx
import os
from dotenv import load_dotenv

load_dotenv()

JOBSGLOBAL_API_URL = os.getenv("JOBSGLOBAL_API_URL", "https://jobsglobal.com/apil/applicants_extended/ws/getAdvertisementJson")
JOBSGLOBAL_BEARER_TOKEN = os.getenv("JOBSGLOBAL_BEARER_TOKEN", "")

async def fetch_jobs_by_group_id(job_group_id: str) -> dict:
    """
    Fetches job data from JobsGlobal API by job_group_id.
    Returns the API response as a dictionary.
    """
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {JOBSGLOBAL_BEARER_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "job_group_id": job_group_id
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            JOBSGLOBAL_API_URL,
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()
