import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from flask import Flask, Response, jsonify, request


app = Flask(__name__)

OFFICE_EXTENSIONS = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/octet-stream": "xlsx",
    "": "xlsx",
}


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def safe_name(value: Any) -> str:
    name = re.sub(r"[^A-Za-z0-9_.-]+", "-", clean_text(value)).strip(".-")
    return name or "reporte"


def office_binary() -> str:
    configured = clean_text(os.getenv("OFFICE_BIN"))
    candidates = [configured, "soffice", "libreoffice", "openoffice"]
    for candidate in [item for item in candidates if item]:
        resolved = shutil.which(candidate)
        if resolved:
            return resolved
    raise RuntimeError("No se encontro soffice/libreoffice/openoffice en el contenedor.")


def require_authorization() -> tuple[bool, str | None]:
    token = clean_text(os.getenv("OFFICE_CONVERTER_TOKEN"))
    if not token:
        return True, None
    expected = f"Bearer {token}"
    received = request.headers.get("authorization", "")
    if received == expected:
        return True, None
    return False, "No autorizado para ejecutar el conversor."


def convert_to_pdf(content: bytes, base_name: str, extension: str) -> bytes:
    binary = office_binary()
    timeout = int(os.getenv("OFFICE_CONVERT_TIMEOUT_SECONDS", "180"))
    with tempfile.TemporaryDirectory(prefix="office-convert-") as temp_dir:
        work_dir = Path(temp_dir)
        name = safe_name(base_name)
        input_path = work_dir / f"{name}.{extension}"
        output_path = work_dir / f"{name}.pdf"
        input_path.write_bytes(content)

        command = [
            binary,
            "--headless",
            "--nologo",
            "--nofirststartwizard",
            "--nodefault",
            "--nolockcheck",
            f"-env:UserInstallation={(work_dir / 'profile').as_uri()}",
            "--convert-to",
            "pdf",
            "--outdir",
            str(work_dir),
            str(input_path),
        ]
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if completed.returncode != 0 or not output_path.exists():
            message = (completed.stderr or completed.stdout or "LibreOffice no genero el PDF.").strip()
            raise RuntimeError(message)
        return output_path.read_bytes()


@app.get("/health")
def health():
    try:
        binary = office_binary()
        version = subprocess.run(
            [binary, "--version"],
            check=False,
            capture_output=True,
            text=True,
            timeout=20,
        ).stdout.strip()
    except Exception as exc:
        return jsonify({"ok": False, "message": str(exc)}), 500
    return jsonify({"ok": True, "office": version})


@app.post("/")
@app.post("/convert")
def convert():
    authorized, message = require_authorization()
    if not authorized:
        return jsonify({"status": "unauthorized", "message": message}), 401

    content = request.get_data()
    if not content:
        return jsonify({"status": "rejected", "message": "No se recibio un archivo de Office."}), 400
    extension = OFFICE_EXTENSIONS.get(request.mimetype or "")
    if not extension:
        return jsonify({"status": "rejected", "message": "Formato no admitido. Envia un XLSX o DOCX."}), 415

    base_name = clean_text(request.headers.get("x-report-name")) or "reporte"
    try:
        pdf_bytes = convert_to_pdf(content, base_name, extension)
    except subprocess.TimeoutExpired:
        return jsonify({"status": "failed", "message": "LibreOffice excedio el tiempo maximo de conversion."}), 504
    except Exception as exc:
        app.logger.exception("Conversion failed")
        return jsonify({"status": "failed", "message": str(exc)}), 422

    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{safe_name(base_name)}.pdf"'},
    )
