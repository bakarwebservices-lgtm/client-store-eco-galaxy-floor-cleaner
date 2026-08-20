import subprocess

subprocess.run(['git', 'add', '.'], check=True)
msg = "feat(a11y): modal and drawer focus trapping, Escape dismissal and ARIA dialog attributes"
subprocess.run(['git', 'commit', '-m', msg], check=True)
print("Commit 2 complete")
