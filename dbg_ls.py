import asyncio
import os
from e2b import AsyncSandbox

async def test_ls():
    api_key = os.getenv("E2B_API_KEY")
    sandbox = await AsyncSandbox.connect("idx1nw2j5cj26k59twidb", api_key=api_key)
    
    print("Inspecting /home/user :")
    try:
        user_items = await sandbox.files.list("/home/user")
        for i in user_items:
            # Print ALL attributes and their values for the first item
            print(f"Item: {i.name}")
            for attr in dir(i):
                if not attr.startswith("_"):
                    try:
                        val = getattr(i, attr)
                        print(f"  {attr}: {val}")
                    except:
                        pass
            break # Just check one
    except Exception as e:
        print(f"  Error: {e}")
        
    await sandbox.close()

if __name__ == "__main__":
    asyncio.run(test_ls())
