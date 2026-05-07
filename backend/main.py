import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from jinja2 import Environment, FileSystemLoader
from pydantic import BaseModel

app = FastAPI(title="IEDC Document Generator API")

BASE_DIR = Path(__file__).parent

# Mount static images for local development (templates use base64 on Vercel)
images_dir = BASE_DIR / "images"
if images_dir.exists():
    try:
        app.mount("/static", StaticFiles(directory=str(images_dir)), name="static")
    except Exception:
        pass

# CORS: read allowed origins from env so Vercel prod URL can be added later.
# On Vercel, frontend and backend share the same domain so CORS is not required,
# but we keep it for local development and flexibility.
_env_origins = os.environ.get("ALLOWED_ORIGINS", "")
origins = (
    _env_origins.split(",")
    if _env_origins
    else [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SCHEMAS_DIR = BASE_DIR / "schemas"
TEMPLATES_DIR = BASE_DIR / "templates"

jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))


class PreviewRequest(BaseModel):
    name: str
    data: dict


class GenerateRequest(BaseModel):
    name: str
    data: dict


def load_schema(name: str) -> dict:
    path = SCHEMAS_DIR / f"{name}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Template '{name}' not found")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def render_template(name: str, data: dict) -> str:
    tpl_path = TEMPLATES_DIR / f"{name}.html"
    if not tpl_path.exists():
        raise HTTPException(status_code=404, detail=f"HTML template '{name}' not found")
    template = jinja_env.get_template(f"{name}.html")
    return template.render(**data)


@app.get("/templates")
def list_templates():
    templates = []
    for schema_file in sorted(SCHEMAS_DIR.glob("*.json")):
        with open(schema_file, encoding="utf-8") as f:
            schema = json.load(f)
        templates.append({
            "id": schema_file.stem,
            "name": schema.get("name", schema_file.stem),
            "description": schema.get("description", ""),
            "icon": schema.get("icon", "📄"),
        })
    return templates


@app.get("/templates/{name}")
def get_template(name: str):
    schema = load_schema(name)
    tpl_path = TEMPLATES_DIR / f"{name}.html"
    template_html = tpl_path.read_text(encoding="utf-8") if tpl_path.exists() else ""
    return {"schema": schema, "template": template_html}


@app.post("/preview")
def preview(req: PreviewRequest):
    html = render_template(req.name, req.data)
    return {"html": html}


@app.get("/health")
def health():
    return {"status": "ok"}
