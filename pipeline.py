import anthropic
import json
import os
import sys

API_KEY = os.environ.get("ANTHROPIC_API_KEY") or (sys.argv[1] if len(sys.argv) > 1 else "")
if not API_KEY:
    sys.exit("Usage: python pipeline.py <api-key>  OR  set ANTHROPIC_API_KEY env var")

client = anthropic.Anthropic(api_key=API_KEY)
print("Anthropic client initialised successfully.")
