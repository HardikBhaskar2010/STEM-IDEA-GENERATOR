
import requests
import json

SUPABASE_URL = "https://cikcicjfecctzsueaaki.supabase.co"
SUPABASE_KEY = "REDACTED_SECRET"

tables = [
    "users",
    "components",
    "projects",
    "chat_messages",
    "veronica_project_chats",
    "veronica_chat_messages",
    "effect_presets",
    "component_reviews",
    "component_projects",
    "component_alternatives"
]

results = {}

for table in tables:
    try:
        # Try to select 1 row to see if table exists and what columns it has
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/{table}?select=*&limit=1",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}"
            }
        )
        if response.status_code == 200:
            data = response.json()
            cols = list(data[0].keys()) if data else "Exists (Empty)"
            results[table] = {"status": "OK", "columns": cols}
        elif response.status_code == 404:
            results[table] = {"status": "Missing"}
        else:
            results[table] = {"status": f"Error {response.status_code}", "msg": response.text}
    except Exception as e:
        results[table] = {"status": "Exception", "msg": str(e)}

print(json.dumps(results, indent=2))
