import subprocess
import sys
from datetime import datetime

def main():
    output_file = r'D:\Anti-LinkedIn\git_push_output.txt'
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"=== Git Push Attempt at {datetime.now()} ===\n\n")
        
        # Check repo exists
        f.write("1. Checking if GitHub repo exists...\n")
        try:
            result = subprocess.run(
                ['gh', 'repo', 'view', 'unlinkedplus-spec/unlinkedplus', '--json', 'name,isEmpty'],
                capture_output=True,
                text=True,
                timeout=30
            )
            f.write(f"   Exit code: {result.returncode}\n")
            f.write(f"   Output: {result.stdout}\n")
            if result.stderr:
                f.write(f"   Errors: {result.stderr}\n")
        except Exception as e:
            f.write(f"   Exception: {e}\n")
        
        # Check current branch
        f.write("\n2. Checking current branch...\n")
        try:
            result = subprocess.run(
                ['git', 'branch', '--show-current'],
                cwd=r'D:\Anti-LinkedIn',
                capture_output=True,
                text=True
            )
            f.write(f"   Branch: {result.stdout.strip()}\n")
        except Exception as e:
            f.write(f"   Exception: {e}\n")
        
        # Check commits
        f.write("\n3. Checking recent commits...\n")
        try:
            result = subprocess.run(
                ['git', 'log', '--oneline', '-3'],
                cwd=r'D:\Anti-LinkedIn',
                capture_output=True,
                text=True
            )
            f.write(f"   Commits:\n{result.stdout}\n")
        except Exception as e:
            f.write(f"   Exception: {e}\n")
        
        # Attempt push
        f.write("\n4. Attempting git push...\n")
        try:
            result = subprocess.run(
                ['git', 'push', '-u', 'origin', 'main'],
                cwd=r'D:\Anti-LinkedIn',
                capture_output=True,
                text=True,
                timeout=120
            )
            f.write(f"   Exit code: {result.returncode}\n")
            f.write(f"   Stdout: {result.stdout}\n")
            f.write(f"   Stderr: {result.stderr}\n")
            
            if result.returncode == 0:
                f.write("\n✓ SUCCESS: Git push completed!\n")
            else:
                f.write("\n✗ FAILED: Git push failed!\n")
                
        except subprocess.TimeoutExpired:
            f.write("\n✗ TIMEOUT: Git push timed out after 120s\n")
        except Exception as e:
            f.write(f"\n✗ EXCEPTION: {e}\n")
    
    print(f"Output written to: {output_file}")
    return 0

if __name__ == '__main__':
    sys.exit(main())
