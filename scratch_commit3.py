import subprocess

subprocess.run(['git', 'add', '.'], check=True)
msg = "feat(a11y): add matching id and htmlFor labels, aria-required, and autocomplete attributes"
subprocess.run(['git', 'commit', '-m', msg], check=True)
print("Commit 3 complete")
