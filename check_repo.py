import subprocess
import json

def check_repo():
    """Check if GitHub repo exists using gh CLI"""
    try:
        result = subprocess.run(
            ['gh', 'repo', 'view', 'unlinkedplus-spec/unlinkedplus', '--json', 'name,owner,url,isEmpty'],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            data = json.loads(result.stdout)
            print(f"✓ Repo found: {data['owner']['login']}/{data['name']}")
            print(f"  URL: {data['url']}")
            print(f"  Is Empty: {data['isEmpty']}")
            return True
        else:
            print(f"✗ Repo check failed:")
            print(f"  stderr: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"✗ Error checking repo: {e}")
        return False

def try_push():
    """Try to push code"""
    try:
        # First, check current branch and commits
        branch_result = subprocess.run(
            ['git', 'branch', '--show-current'],
            cwd=r'D:\Anti-LinkedIn',
            capture_output=True,
            text=True
        )
        print(f"\nCurrent branch: {branch_result.stdout.strip()}")
        
        # Check if there are commits to push
        log_result = subprocess.run(
            ['git', 'log', '--oneline', '-5'],
            cwd=r'D:\Anti-LinkedIn',
            capture_output=True,
            text=True
        )
        print(f"\nRecent commits:")
        print(log_result.stdout)
        
        # Try push with verbose output
        print("\n--- Attempting git push ---")
        push_result = subprocess.run(
            ['git', 'push', '-u', 'origin', 'main', '--verbose'],
            cwd=r'D:\Anti-LinkedIn',
            capture_output=True,
            text=True,
            timeout=120
        )
        
        print(f"Exit code: {push_result.returncode}")
        print(f"\nStdout:\n{push_result.stdout}")
        print(f"\nStderr:\n{push_result.stderr}")
        
        return push_result.returncode == 0
        
    except subprocess.TimeoutExpired:
        print("✗ Push timed out after 120s")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == '__main__':
    print("=== Checking GitHub Repo ===")
    repo_exists = check_repo()
    
    if repo_exists:
        print("\n=== Attempting Git Push ===")
        try_push()
