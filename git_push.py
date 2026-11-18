import subprocess
import sys

def run_git_push():
    """Execute git push and capture all output"""
    try:
        print("Starting git push to origin main...")
        
        # Run git push with full output capture
        result = subprocess.run(
            ['git', 'push', '-u', 'origin', 'main'],
            cwd=r'D:\Anti-LinkedIn',
            capture_output=True,
            text=True,
            timeout=120
        )
        
        print(f"\n=== STDOUT ===")
        print(result.stdout)
        
        print(f"\n=== STDERR ===")
        print(result.stderr)
        
        print(f"\n=== EXIT CODE ===")
        print(result.returncode)
        
        if result.returncode == 0:
            print("\n✓ Git push successful!")
        else:
            print("\n✗ Git push failed!")
            
        return result.returncode
        
    except subprocess.TimeoutExpired:
        print("✗ Git push timed out after 120 seconds")
        return 1
    except Exception as e:
        print(f"✗ Error during git push: {e}")
        return 1

if __name__ == '__main__':
    exit_code = run_git_push()
    sys.exit(exit_code)
