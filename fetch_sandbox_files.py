import asyncio
import os
import sys
import tarfile
import io

# TARGET SANDBOX
SANDBOX_ID = sys.argv[1] if len(sys.argv) > 1 else "ix6mzbwnqyugjon0qal3d"
LOCAL_DIR = "./restored_sandbox"

async def fetch_files():
    api_key = os.getenv("E2B_API_KEY")
    if not api_key:
        try:
            with open("backend/.env", "r") as f:
                for line in f:
                    if line.startswith("E2B_API_KEY="):
                        api_key = line.split("=", 1)[1].strip()
                        break
        except:
            pass
            
    if not api_key:
        print("Error: E2B_API_KEY environment variable not set.")
        return

    print(f"Connecting to sandbox {SANDBOX_ID}...")
    try:
        from e2b import AsyncSandbox
        async with await AsyncSandbox.connect(SANDBOX_ID, api_key=api_key) as sandbox:
            target_tar = "/home/user/backup.tar.gz"
            print(f"Creating tarball in {target_tar}...")
            # We explicitly exclude node_modules and hidden cache to keep it light
            cmd = f"tar -C /home/user -czf {target_tar} --exclude='./node_modules' --exclude='./.npm' --exclude='./.cache' --exclude='./.git' ."
            
            proc = await sandbox.commands.run(cmd)
            if proc.exit_code != 0:
                print(f"Error creating tarball: {proc.stderr}")
                return

            print("Downloading tarball from sandbox...")
            # Use format='binary' to ensure we get raw bytes for the .tar.gz
            # Note: older E2B versions might not have format='binary', so we'll check
            try:
                tarball_content = await sandbox.files.read(target_tar, format="binary")
            except Exception as e:
                print(f"Direct binary read failed, attempting default read: {e}")
                tarball_content = await sandbox.files.read(target_tar)
            
            if not tarball_content:
                print("Error: Tarball is empty or could not be read.")
                return

            print(f"Received {len(tarball_content)} bytes. Extracting to {LOCAL_DIR}...")
            os.makedirs(LOCAL_DIR, exist_ok=True)
            
            # Use BytesIO to handle potentially string output if it wasn't binary
            if isinstance(tarball_content, str):
                tarball_content = tarball_content.encode('latin1') # Hack to treat as bytes
                
            with tarfile.open(fileobj=io.BytesIO(tarball_content), mode="r:gz") as tar:
                tar.extractall(path=LOCAL_DIR)
            
            # Cleanup
            await sandbox.commands.run(f"rm {target_tar}")
                
            print(f"\nSuccessfully restored the entire /home/user to {os.path.abspath(LOCAL_DIR)}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(fetch_files())
