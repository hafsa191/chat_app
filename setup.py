#!/usr/bin/env python
"""
ChatSync — Ek command mein sab kuch setup karo.
Run: python setup.py
"""
import subprocess, sys, os

def run(cmd, **kw):
    print(f"\n>> {cmd}")
    r = subprocess.run(cmd, shell=True, **kw)
    if r.returncode != 0:
        print(f"ERROR: Command fail hua: {cmd}")
        sys.exit(1)
    return r

os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("=" * 50)
print("  ChatSync Setup")
print("=" * 50)

print("\n[1/3] Dependencies install ho rahi hain...")
run(f"{sys.executable} -m pip install -r requirements.txt -q")

print("\n[2/3] Database migrations chal rahi hain...")
run(f"{sys.executable} manage.py migrate --run-syncdb")

print("\n[3/3] Superuser banana chahte ho? (optional)")
ans = input("    Admin account banao? (y/n): ").strip().lower()
if ans == 'y':
    run(f"{sys.executable} manage.py createsuperuser")

print("\n" + "=" * 50)
print("  ✅ Setup complete!")
print("=" * 50)
print("\n  App start karne ke liye:")
print("\n    daphne core.asgi:application")
print("\n  Phir browser mein kholen:")
print("\n    http://localhost:8000")
print("\n  Collaboration test karne ke liye:")
print("    2 alag tabs mein same room open karein")
print("=" * 50)
