
import json
import sys
import os

# Add the current directory to sys.path so we can import 'app'
sys.path.append(os.getcwd())

from app.main import app

with open("openapi.json", "w") as f:
    json.dump(app.openapi(), f, indent=2)
print("openapi.json generated successfully")
