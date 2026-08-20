import subprocess

subprocess.run(['git', 'add', '.'], check=True)
msg = "feat(a11y): upgrade color tokens to WCAG AA and enlarge interactive touch targets"
subprocess.run(['git', 'commit', '-m', msg], check=True)
print("Commit 4 complete")
