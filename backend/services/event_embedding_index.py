import os
import time
from dotenv import load_dotenv
from supabase import create_client, Client
from openai import OpenAI

from typing import List, Dict, Any
import httpx

# --- Monkey Patch for Supabase/HTTPX compatibility ---
# Fixes TypeError: Client.__init__() got an unexpected keyword argument 'proxy'
# This occurs due to a mismatch between specific versions of supabase/gotrue and httpx.
_original_init = httpx.Client.__init__

def _patched_init(self, *args, **kwargs):
    if 'proxy' in kwargs:
        proxy_arg = kwargs.pop('proxy')
        # If a proxy was actually passed, map it to 'proxies' (plural) which this httpx version expects
        if proxy_arg is not None and 'proxies' not in kwargs:
            kwargs['proxies'] = proxy_arg
    return _original_init(self, *args, **kwargs)

httpx.Client.__init__ = _patched_init
# -----------------------------------------------------

# --- 1. Configuration ---
load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY")
EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
BATCH_SIZE: int = int(os.getenv("BATCH_SIZE", 100))

# --- 2. Initialize Clients ---
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    openai_client: OpenAI = OpenAI(api_key=OPENAI_API_KEY)
except Exception as e:
    print(f"Error initializing clients: {e}")
    exit()

def get_embedding(text: str) -> List[float] | None:
    """Generates a vector embedding for the given text using OpenAI."""
    try:
        # Normalize the text for better embedding quality
        input_text = text.replace("\n", " ")
        
        response = openai_client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=input_text
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error generating embedding for text: '{text[:50]}...' -> {e}")
        # Return None to indicate failure for this row
        return None

def backfill_embeddings():
    """Fetches event records without embeddings, generates them, and updates the table."""
    print(f"Starting backfill for event_list in incremental mode (only NULL embeddings)")
    print(f"Using model: {EMBEDDING_MODEL} with batch size: {BATCH_SIZE}")
    
    total_processed = 0
    
    while True:
        # --- 3. Fetch Data Batch ---
        print(f"\nFetching next batch (up to {BATCH_SIZE})...")
        
        # Build the query - only fetch records without embeddings
        query = supabase.table("event_list").select("id, event_date, industry, job_location, title, description, status")
        query = query.is_("embedding", None)
        
        response = query.limit(BATCH_SIZE).execute()
        
        events: List[Dict[str, Any]] = response.data
        
        if not events:
            print("--- BACKFILL COMPLETE: No more rows to process. ---")
            break

        print(f"Processing {len(events)} events in this batch...")
        
        # Prepare a list of updates for the batch
        updates = []
        
        for event in events:
            event_id = event.get("id")
            title = event.get("title")
            description = event.get("description")
            event_date = event.get("event_date")
            industry = event.get("industry")
            job_location = event.get("job_location")
            status = event.get("status")

            # --- 4. Combine Text and Generate Embedding ---
            if not title and not description:
                print(f"Warning: Event ID {event_id} has no title or description. Skipping.")
                continue

            # Concatenate the relevant fields into a single string for the model
            content_to_embed = f"Title: {title}. Description: {description}. Event Date: {event_date}. Industry: {industry}. Location: {job_location}. Status: {status}"
            
            embedding_vector = get_embedding(content_to_embed)
            
            if embedding_vector:
                # Add the update to our batch list
                updates.append({
                    "id": event_id,
                    "embedding": embedding_vector,
                })
        
        # --- 5. Batch Update Records ---
        if updates:
            print(f"Attempting to update {len(updates)} records in the database...")
            try:
                # Update each record individually to only modify the embedding field
                for update in updates:
                    supabase.table("event_list").update({"embedding": update["embedding"]}).eq("id", update["id"]).execute()
                
                total_processed += len(updates)
                print(f"Successfully updated {len(updates)} records. Total processed: {total_processed}")

            except Exception as e:
                print(f"An unexpected error occurred during database update: {e}")
                # Wait before retrying the next batch
                time.sleep(5)
                continue
        
        # Rate-limit control: wait a moment before fetching the next batch
        time.sleep(1)


if __name__ == "__main__":
    if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY]):
        print("ERROR: Missing one or more required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY). Check your .env file.")
    else:
        backfill_embeddings()
