import io
import os
import re
import unicodedata
import uuid
from typing import Any
from urllib.parse import quote, urlparse

import cv2
import fitz
import firebase_admin
import numpy as np
import requests
from firebase_admin import credentials, storage
from flask import Flask, jsonify, request


DOCUMENT_RATIO = 8.6 / 5.4
DEFAULT_OUTPUT_WIDTH = 1600
OUTPUT_PREFIX = "matriculas/documentos-procesados"
OCR_ORIENTATION_KEYWORDS = {
    "REPUBLICA": 3,
    "DOCUMENTO": 3,
    "NACIONAL": 3,
    "IDENTIDAD": 3,
    "APELLIDO": 3,
    "APELLIDOS": 3,
    "NOMBRES": 3,
    "NACIMIENTO": 3,
    "CADUCIDAD": 2,
    "EMISION": 2,
    "DIRECCION": 4,
    "DOMICILIO": 4,
    "DISTRITO": 4,
    "PROVINCIA": 2,
    "DEPARTAMENTO": 2,
    "HUELLAS": 3,
    "SUFRAGIO": 3,
    "CONSTANCIA": 3,
    "PER<": 4,
    "I<PER": 4,
}
OCR_FRONT_KEYWORDS = {
    "REPUBLICA": 3,
    "DOCUMENTO": 3,
    "NACIONAL": 3,
    "IDENTIDAD": 3,
    "APELLIDO": 3,
    "APELLIDOS": 3,
    "NOMBRES": 3,
    "PRENOMBRES": 3,
    "NACIMIENTO": 3,
    "NACIONALIDAD": 3,
    "SEXO": 3,
    "ESTADO": 2,
    "CIVIL": 2,
    "CADUCIDAD": 2,
    "EMISION": 2,
    "CUI": 2,
}
OCR_BACK_KEYWORDS = {
    "DIRECCION": 5,
    "DOMICILIO": 5,
    "DISTRITO": 4,
    "PROVINCIA": 2,
    "DEPARTAMENTO": 2,
    "HUELLAS": 3,
    "SUFRAGIO": 3,
    "CONSTANCIA": 3,
    "PER<": 6,
    "I<PER": 6,
}

app = Flask(__name__)


def init_firebase() -> None:
    if firebase_admin._apps:
        return

    bucket_name = get_configured_bucket()
    options = {"storageBucket": bucket_name} if bucket_name else None
    firebase_admin.initialize_app(credentials.ApplicationDefault(), options)


def get_configured_bucket() -> str | None:
    return (
        os.getenv("FIREBASE_STORAGE_BUCKET")
        or os.getenv("STORAGE_BUCKET")
        or os.getenv("BUCKET_NAME")
    )


def candidate_bucket_names() -> list[str]:
    names: list[str] = []
    configured = get_configured_bucket()
    if configured:
        names.append(configured)

    project_id = (
        os.getenv("GOOGLE_CLOUD_PROJECT")
        or os.getenv("GCLOUD_PROJECT")
        or os.getenv("GCP_PROJECT")
    )
    if project_id:
        names.extend([
            f"{project_id}.firebasestorage.app",
            f"{project_id}.appspot.com",
        ])

    result: list[str] = []
    for name in names:
        if name and name not in result:
            result.append(name)
    return result


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def normalize_ocr_text(value: Any) -> str:
    text = unicodedata.normalize("NFKD", clean_text(value).upper())
    text = "".join(char for char in text if not unicodedata.combining(char))
    return re.sub(r"\s+", " ", text)


def normalize_area(value: Any) -> str:
    text = clean_text(value).lower()
    text = (
        text.replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
    )
    if "superior" in text or text in {"arriba", "top"}:
        return "superior"
    if "inferior" in text or text in {"abajo", "bottom"}:
        return "inferior"
    if "pagina-2" in text or "page-2" in text or text == "2":
        return "pagina-2"
    if "pagina-1" in text or "page-1" in text or text == "1":
        return "pagina-1"
    return "completa"


def require_authorization() -> tuple[bool, str | None]:
    token = os.getenv("PROCESSOR_TOKEN")
    if not token:
        return True, None
    expected = f"Bearer {token}"
    received = request.headers.get("authorization", "")
    if received == expected:
        return True, None
    return False, "No autorizado para ejecutar el procesador."


def download_from_storage(path: str) -> tuple[bytes, str]:
    errors: list[str] = []
    for bucket_name in candidate_bucket_names():
        try:
            bucket = storage.bucket(bucket_name)
            blob = bucket.blob(path)
            if not blob.exists():
                errors.append(f"{bucket_name}: no existe {path}")
                continue
            return blob.download_as_bytes(), bucket_name
        except Exception as exc:
            errors.append(f"{bucket_name}: {exc}")
    raise RuntimeError("No se pudo descargar desde Storage. " + " | ".join(errors))


def is_local_url(value: str) -> bool:
    try:
        hostname = (urlparse(value).hostname or "").lower()
    except Exception:
        return False
    return hostname in {"localhost", "127.0.0.1", "::1"} or hostname.startswith("127.")


def download_source(source: dict[str, Any]) -> tuple[bytes, str | None, str | None]:
    path = clean_text(source.get("path"))
    storage_error: Exception | None = None
    if path:
        try:
            content, bucket_name = download_from_storage(path)
            return content, bucket_name, path
        except Exception as exc:
            storage_error = exc
            if not clean_text(source.get("url")):
                raise

    url = clean_text(source.get("url"))
    if not url:
        raise RuntimeError("El lado del documento no tiene source.path ni source.url.")
    if is_local_url(url):
        message = (
            "El archivo del documento apunta al emulador local de Firebase Storage. "
            "Sube el documento a Firebase Storage real o desactiva los emuladores en el frontend."
        )
        if storage_error:
            message = f"{message} Error al leer source.path: {storage_error}"
        raise RuntimeError(message)

    response = requests.get(url, timeout=60)
    response.raise_for_status()
    return response.content, get_configured_bucket(), path or None


def render_pdf_page(content: bytes, area: str) -> np.ndarray:
    page_index = 1 if area == "pagina-2" else 0
    document = fitz.open(stream=content, filetype="pdf")
    if document.page_count == 0:
        raise RuntimeError("El PDF no tiene paginas.")
    page_index = min(page_index, document.page_count - 1)
    page = document.load_page(page_index)
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), alpha=False)
    image = np.frombuffer(pixmap.samples, dtype=np.uint8).reshape(
        pixmap.height,
        pixmap.width,
        pixmap.n,
    )
    if pixmap.n == 3:
        return cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    return cv2.cvtColor(image, cv2.COLOR_RGBA2BGR)


def decode_image(content: bytes, content_type: str, source_path: str | None, area: str) -> np.ndarray:
    lower_path = (source_path or "").lower()
    if "pdf" in content_type.lower() or lower_path.endswith(".pdf"):
        return render_pdf_page(content, area)

    data = np.frombuffer(content, dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        raise RuntimeError("No se pudo decodificar la imagen.")
    return image


def preselect_body(image: np.ndarray, has_two_bodies: bool, area: str) -> np.ndarray:
    if not has_two_bodies:
        return image

    height = image.shape[0]
    if area == "superior":
        return image[: int(height * 0.56), :]
    if area == "inferior":
        return image[int(height * 0.44) :, :]
    return image


def normalize_side(value: Any) -> str:
    text = clean_text(value).lower()
    if "frente" in text or "front" in text or "delante" in text:
        return "frente"
    if "reverso" in text or "back" in text or "posterior" in text:
        return "reverso"
    return "lado"


def opposite_side(side: str) -> str:
    return "reverso" if side == "frente" else "frente"


def opposite_area(area: str) -> str:
    return "inferior" if area == "superior" else "superior"


def order_points(points: np.ndarray) -> np.ndarray:
    rect = np.zeros((4, 2), dtype="float32")
    sums = points.sum(axis=1)
    diffs = np.diff(points, axis=1)
    rect[0] = points[np.argmin(sums)]
    rect[2] = points[np.argmax(sums)]
    rect[1] = points[np.argmin(diffs)]
    rect[3] = points[np.argmax(diffs)]
    return rect


def rect_bounds(rect: np.ndarray) -> tuple[float, float, float, float]:
    xs = rect[:, 0]
    ys = rect[:, 1]
    return float(xs.min()), float(ys.min()), float(xs.max()), float(ys.max())


def rect_iou(rect_a: np.ndarray, rect_b: np.ndarray) -> float:
    ax1, ay1, ax2, ay2 = rect_bounds(rect_a)
    bx1, by1, bx2, by2 = rect_bounds(rect_b)
    intersection_x1 = max(ax1, bx1)
    intersection_y1 = max(ay1, by1)
    intersection_x2 = min(ax2, bx2)
    intersection_y2 = min(ay2, by2)
    intersection = max(0.0, intersection_x2 - intersection_x1) * max(0.0, intersection_y2 - intersection_y1)
    area_a = max(1.0, (ax2 - ax1) * (ay2 - ay1))
    area_b = max(1.0, (bx2 - bx1) * (by2 - by1))
    return intersection / max(1.0, area_a + area_b - intersection)


def contour_to_rect(contour: np.ndarray) -> np.ndarray | None:
    peri = cv2.arcLength(contour, True)
    approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
    if len(approx) == 4:
        return order_points(approx.reshape(4, 2).astype("float32"))

    box = cv2.boxPoints(cv2.minAreaRect(contour))
    if box is None or len(box) != 4:
        return None
    return order_points(box.astype("float32"))


def build_document_detection_masks(image: np.ndarray) -> list[tuple[str, np.ndarray]]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 35, 140)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]
    height, width = image.shape[:2]
    close_size = max(11, int(min(width, height) * 0.035))
    if close_size % 2 == 0:
        close_size += 1
    close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (close_size, close_size))
    blue_close_size = max(close_size, int(min(width, height) * 0.065))
    if blue_close_size % 2 == 0:
        blue_close_size += 1
    blue_close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (blue_close_size, blue_close_size))
    open_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))

    blue_card = ((hsv[:, :, 0] >= 74) & (hsv[:, :, 0] <= 125) & (saturation > 18) & (value > 35) & (value < 252)).astype(np.uint8) * 255
    blue_card = cv2.morphologyEx(blue_card, cv2.MORPH_CLOSE, blue_close_kernel, iterations=2)
    blue_card = cv2.morphologyEx(blue_card, cv2.MORPH_OPEN, open_kernel, iterations=1)
    blue_card = cv2.dilate(blue_card, np.ones((5, 5), np.uint8), iterations=1)

    color_card = ((saturation > 24) & (value > 45) & (value < 252)).astype(np.uint8) * 255
    color_card = cv2.morphologyEx(color_card, cv2.MORPH_CLOSE, close_kernel, iterations=2)
    color_card = cv2.morphologyEx(color_card, cv2.MORPH_OPEN, open_kernel, iterations=1)
    color_card = cv2.dilate(color_card, np.ones((5, 5), np.uint8), iterations=1)

    non_white = ((gray < 248) | (saturation > 16)).astype(np.uint8) * 255
    foreground = cv2.morphologyEx(non_white, cv2.MORPH_CLOSE, close_kernel, iterations=2)
    foreground = cv2.morphologyEx(foreground, cv2.MORPH_OPEN, open_kernel, iterations=1)
    foreground = cv2.dilate(foreground, np.ones((5, 5), np.uint8), iterations=1)

    return [("blue_card", blue_card), ("color_card", color_card), ("foreground", foreground), ("edges", edges)]


def rect_mask_fill_ratio(mask: np.ndarray, rect: np.ndarray) -> float:
    polygon = np.zeros(mask.shape[:2], dtype=np.uint8)
    cv2.fillConvexPoly(polygon, np.round(rect).astype(np.int32), 255)
    polygon_area = max(1, int(np.count_nonzero(polygon)))
    filled_area = int(np.count_nonzero(cv2.bitwise_and(mask, polygon)))
    return filled_area / polygon_area


def border_touch_penalty(rect: np.ndarray, image_width: int, image_height: int) -> float:
    x1, y1, x2, y2 = rect_bounds(rect)
    margin_x = image_width * 0.018
    margin_y = image_height * 0.018
    touches = (
        x1 <= margin_x
        or y1 <= margin_y
        or x2 >= image_width - margin_x
        or y2 >= image_height - margin_y
    )
    return 0.55 if touches else 1.0


def find_document_contours(image: np.ndarray, limit: int = 1) -> list[np.ndarray]:
    height, width = image.shape[:2]
    scale = 1200 / max(height, width) if max(height, width) > 1200 else 1.0
    resized = cv2.resize(image, (int(width * scale), int(height * scale)))
    image_area = resized.shape[0] * resized.shape[1]
    min_area_fraction = 0.055 if limit > 1 else 0.045
    candidates: list[tuple[float, np.ndarray]] = []

    detection_masks = build_document_detection_masks(resized)
    color_mask = next(mask for name, mask in detection_masks if name == "color_card")

    for mask_name, mask in detection_masks:
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:30]

        for contour in contours:
            contour_area = cv2.contourArea(contour)
            if contour_area > image_area * 0.94:
                continue

            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
            if len(approx) < 4:
                continue

            rect = contour_to_rect(contour)
            if rect is None:
                continue
            w1 = np.linalg.norm(rect[2] - rect[3])
            w2 = np.linalg.norm(rect[1] - rect[0])
            h1 = np.linalg.norm(rect[1] - rect[2])
            h2 = np.linalg.norm(rect[0] - rect[3])
            rect_width = max(w1, w2)
            rect_height = max(h1, h2)
            rect_area = max(1.0, rect_width * rect_height)
            rect_fraction = rect_area / image_area
            if rect_fraction < min_area_fraction or rect_fraction > 0.92:
                continue

            ratio = rect_width / max(1.0, rect_height)
            normalized_ratio = ratio if ratio >= 1 else 1 / ratio
            if not 1.35 <= normalized_ratio <= 1.82:
                continue

            fill_ratio = contour_area / rect_area
            if mask_name in {"color_card", "foreground"} and fill_ratio < 0.20:
                continue

            color_fill_ratio = rect_mask_fill_ratio(color_mask, rect)
            if mask_name == "color_card" and color_fill_ratio < 0.12:
                continue
            if mask_name == "blue_card" and color_fill_ratio < 0.09:
                continue
            if mask_name != "color_card" and color_fill_ratio < 0.055:
                continue

            ratio_score = 1.0 - min(abs(normalized_ratio - DOCUMENT_RATIO) / DOCUMENT_RATIO, 1.0)
            area_score = min(rect_fraction / 0.20, 1.0)
            mask_bonus = 1.2 if mask_name == "blue_card" else 0.85 if mask_name == "color_card" else 0.35 if mask_name == "foreground" else 0.0
            color_bonus = min(color_fill_ratio * 2.4, 1.65)
            border_penalty = border_touch_penalty(rect, resized.shape[1], resized.shape[0])
            score = contour_area * (1.0 + ratio_score + area_score + mask_bonus + color_bonus) * border_penalty
            candidates.append((score, rect / scale))

    result: list[np.ndarray] = []
    for _, rect in sorted(candidates, key=lambda item: item[0], reverse=True):
        if any(rect_iou(rect, existing) > 0.45 for existing in result):
            continue
        result.append(rect)
        if len(result) >= limit:
            break

    return result


def find_document_contour(image: np.ndarray) -> np.ndarray | None:
    contours = find_document_contours(image, limit=1)
    return contours[0] if contours else None


def fallback_document_box(image: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    margin_x = int(width * 0.04)
    margin_y = int(height * 0.04)
    return np.array(
        [
            [margin_x, margin_y],
            [width - margin_x, margin_y],
            [width - margin_x, height - margin_y],
            [margin_x, height - margin_y],
        ],
        dtype="float32",
    )


def warp_document(image: np.ndarray, contour: np.ndarray | None) -> np.ndarray:
    rect = order_points(contour if contour is not None else fallback_document_box(image))
    width_a = np.linalg.norm(rect[2] - rect[3])
    width_b = np.linalg.norm(rect[1] - rect[0])
    height_a = np.linalg.norm(rect[1] - rect[2])
    height_b = np.linalg.norm(rect[0] - rect[3])

    source_width = max(width_a, width_b)
    source_height = max(height_a, height_b)
    source_is_portrait = source_height > source_width * 1.08

    detected_width = int(max(source_width, source_height))
    output_width = int(os.getenv("OUTPUT_WIDTH", str(DEFAULT_OUTPUT_WIDTH)))
    output_width = max(1000, min(max(output_width, detected_width), 2400))
    output_height = int(round(output_width / DOCUMENT_RATIO))
    destination_width = output_height if source_is_portrait else output_width
    destination_height = output_width if source_is_portrait else output_height

    destination = np.array(
        [
            [0, 0],
            [destination_width - 1, 0],
            [destination_width - 1, destination_height - 1],
            [0, destination_height - 1],
        ],
        dtype="float32",
    )

    matrix = cv2.getPerspectiveTransform(rect, destination)
    warped = cv2.warpPerspective(image, matrix, (destination_width, destination_height))
    if source_is_portrait:
        rotation_direction = clean_text(os.getenv("PORTRAIT_ROTATION_DIRECTION")).lower()
        if rotation_direction in {"clockwise", "cw", "right"}:
            warped = cv2.rotate(warped, cv2.ROTATE_90_CLOCKWISE)
        else:
            warped = cv2.rotate(warped, cv2.ROTATE_90_COUNTERCLOCKWISE)
    if warped.shape[0] > warped.shape[1]:
        warped = cv2.rotate(warped, cv2.ROTATE_90_CLOCKWISE)
    return warped


def enhance_image(image: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    lightness, channel_a, channel_b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_l = clahe.apply(lightness)
    enhanced = cv2.merge((enhanced_l, channel_a, channel_b))
    enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

    blurred = cv2.GaussianBlur(enhanced, (0, 0), sigmaX=1.0)
    sharpened = cv2.addWeighted(enhanced, 1.45, blurred, -0.45, 0)
    return sharpened


def should_use_ocr_orientation() -> bool:
    return clean_text(os.getenv("ENABLE_OCR_ORIENTATION")).lower() in {"1", "true", "yes", "on"}


def prepare_ocr_image(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape[:2]
    if width < 1400:
        scale = 1400 / max(1, width)
        gray = cv2.resize(gray, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_CUBIC)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    return cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]


def read_ocr_text(image: np.ndarray) -> str:
    try:
        import pytesseract
    except Exception as exc:
        app.logger.warning("OCR skipped because pytesseract is unavailable: %s", exc)
        return ""

    prepared = prepare_ocr_image(image)
    try:
        text = pytesseract.image_to_string(prepared, config="--psm 6")
    except Exception as exc:
        app.logger.warning("OCR failed: %s", exc)
        return ""

    return normalize_ocr_text(text)


def score_keywords(text: str, keywords: dict[str, int]) -> float:
    score = 0.0
    for keyword, weight in keywords.items():
        if keyword in text:
            score += weight
    return score


def ocr_orientation_score(image: np.ndarray) -> tuple[float, str]:
    normalized = read_ocr_text(image)
    if not normalized:
        return 0.0, ""

    score = score_keywords(normalized, OCR_ORIENTATION_KEYWORDS)

    # Text that is upright usually produces more alphabetic tokens than upside-down text.
    score += min(len(re.findall(r"[A-Z]{4,}", normalized)) * 0.35, 4.0)
    return score, normalized[:240]


def auto_orient_with_ocr(image: np.ndarray) -> np.ndarray:
    if not should_use_ocr_orientation():
        return image

    candidates = [
        ("0", image),
        ("180", cv2.rotate(image, cv2.ROTATE_180)),
    ]
    scored = [(name, candidate, *ocr_orientation_score(candidate)) for name, candidate in candidates]
    scored.sort(key=lambda item: item[2], reverse=True)
    best_name, best_image, best_score, best_text = scored[0]
    second_score = scored[1][2] if len(scored) > 1 else 0.0
    min_delta = float(os.getenv("OCR_ORIENTATION_MIN_SCORE_DELTA", "1.5"))

    app.logger.info(
        "OCR orientation scores best=%s best_score=%.2f second_score=%.2f best_text=%s",
        best_name,
        best_score,
        second_score,
        best_text,
    )

    if best_name != "0" and best_score >= 2.0 and (best_score - second_score) >= min_delta:
        return best_image
    return image


def best_side_scores_by_rotation(image: np.ndarray) -> tuple[float, float, str, str]:
    candidates = [
        ("0", image),
        ("180", cv2.rotate(image, cv2.ROTATE_180)),
    ]
    best_front = 0.0
    best_back = 0.0
    best_rotation = "0"
    best_text = ""

    for rotation, candidate in candidates:
        text = read_ocr_text(candidate)
        if not text:
            continue
        front_score = score_keywords(text, OCR_FRONT_KEYWORDS)
        back_score = score_keywords(text, OCR_BACK_KEYWORDS)
        if front_score + back_score > best_front + best_back:
            best_front = front_score
            best_back = back_score
            best_rotation = rotation
            best_text = text[:240]

    return best_front, best_back, best_rotation, best_text


def visual_mrz_score(image: np.ndarray) -> float:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape[:2]
    # The DNI reverse normally has 2-3 dense MRZ rows across the lower half.
    region = gray[int(height * 0.48): int(height * 0.92), int(width * 0.06): int(width * 0.96)]
    if region.size == 0:
        return 0.0

    blurred = cv2.GaussianBlur(region, (3, 3), 0)
    threshold = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    row_density = threshold.mean(axis=1) / 255.0
    dark_ratio = float(threshold.mean() / 255.0)
    dense_rows = float(np.count_nonzero(row_density > 0.10)) / max(1, row_density.shape[0])
    very_dense_rows = float(np.count_nonzero(row_density > 0.18)) / max(1, row_density.shape[0])

    score = 0.0
    if dark_ratio > 0.045:
        score += min((dark_ratio - 0.045) * 80, 4.0)
    if dense_rows > 0.08:
        score += min((dense_rows - 0.08) * 24, 4.0)
    if very_dense_rows > 0.025:
        score += min((very_dense_rows - 0.025) * 34, 3.0)
    return score


def side_classification_features(image: np.ndarray) -> dict[str, Any]:
    front_score, back_score, rotation, text_preview = best_side_scores_by_rotation(image)
    mrz_score = visual_mrz_score(image)
    mrz_rotated_score = visual_mrz_score(cv2.rotate(image, cv2.ROTATE_180))
    return {
        "front": front_score,
        "back": back_score + mrz_score,
        "frontOcr": front_score,
        "backOcr": back_score,
        "mrzVisual": mrz_score,
        "mrzVisualRotated": mrz_rotated_score,
        "rotation": rotation,
        "text": f"rotacion={rotation}; mrzVisual={mrz_score:.2f}; mrzVisualRotado={mrz_rotated_score:.2f}; {text_preview}",
    }


def classify_side_text(image: np.ndarray) -> tuple[float, float, str]:
    features = side_classification_features(image)
    return features["front"], features["back"], features["text"]


def process_selected_image(image: np.ndarray) -> np.ndarray:
    contour = find_document_contour(image)
    warped = warp_document(image, contour)
    return enhance_image(warped)


def process_image(content: bytes, content_type: str, source_path: str | None, side: dict[str, Any]) -> np.ndarray:
    area = normalize_area(side.get("selectedArea"))
    image = decode_image(content, content_type, source_path, area)
    selected = preselect_body(image, bool(side.get("hasTwoBodies")), area)
    return process_selected_image(selected)


def split_two_body_image(image: np.ndarray) -> dict[str, np.ndarray]:
    height = image.shape[0]
    return {
        "superior": image[: int(height * 0.56), :],
        "inferior": image[int(height * 0.44) :, :],
    }


def process_two_body_image(image: np.ndarray) -> tuple[dict[str, np.ndarray], str]:
    contours = find_document_contours(image, limit=2)
    if len(contours) >= 2:
        ordered = sorted(contours[:2], key=lambda rect: float(rect[:, 1].mean()))
        return {
            "superior": enhance_image(warp_document(image, ordered[0])),
            "inferior": enhance_image(warp_document(image, ordered[1])),
        }, "contours"

    split_images = split_two_body_image(image)
    return {
        "superior": process_selected_image(split_images["superior"]),
        "inferior": process_selected_image(split_images["inferior"]),
    }, "split_fallback"


def area_by_output_side(reference_side: dict[str, Any]) -> dict[str, str]:
    selected_area = normalize_area(reference_side.get("selectedArea"))
    source_side = normalize_side(reference_side.get("side"))
    if selected_area in {"superior", "inferior"} and source_side in {"frente", "reverso"}:
        return {
            source_side: selected_area,
            opposite_side(source_side): opposite_area(selected_area),
        }
    return {
        "frente": "superior",
        "reverso": "inferior",
    }


def classify_two_body_areas_by_ocr(
    processed_by_area: dict[str, np.ndarray],
    fallback: dict[str, str],
) -> tuple[dict[str, str], str, dict[str, Any]]:
    areas = ["superior", "inferior"]
    scores: dict[str, dict[str, Any]] = {}
    for area in areas:
        scores[area] = side_classification_features(processed_by_area[area])

    reverse_area = max(areas, key=lambda area: scores[area]["back"] - scores[area]["front"])
    front_area = opposite_area(reverse_area)
    reverse_margin = scores[reverse_area]["back"] - scores[reverse_area]["front"]
    front_margin = scores[front_area]["front"] - scores[front_area]["back"]
    visual_reverse_area = max(areas, key=lambda area: scores[area]["mrzVisual"])
    visual_front_area = opposite_area(visual_reverse_area)
    visual_margin = scores[visual_reverse_area]["mrzVisual"] - scores[visual_front_area]["mrzVisual"]
    diagnostics = {
        "scores": scores,
        "chosenReverseArea": reverse_area,
        "reverseMargin": reverse_margin,
        "frontMargin": front_margin,
        "visualReverseArea": visual_reverse_area,
        "visualMargin": visual_margin,
        "fallback": fallback,
    }

    app.logger.info(
        "Two-body side OCR scores superior=%s inferior=%s chosen_reverse=%s reverse_margin=%.2f front_margin=%.2f",
        scores["superior"],
        scores["inferior"],
        reverse_area,
        reverse_margin,
        front_margin,
    )

    if scores[visual_reverse_area]["mrzVisual"] >= 1.8 and visual_margin >= 0.75:
        return {
            "frente": visual_front_area,
            "reverso": visual_reverse_area,
        }, "visual_mrz_side_classification", diagnostics

    if scores[reverse_area]["back"] >= 3 and (reverse_margin >= 1 or front_margin >= 1):
        return {
            "frente": front_area,
            "reverso": reverse_area,
        }, "ocr_visual_side_classification", diagnostics

    return fallback, "metadata_or_position_fallback", diagnostics


def select_two_body_reference(sides: list[Any]) -> dict[str, Any] | None:
    valid_sides = [side for side in sides if isinstance(side, dict) and bool(side.get("hasTwoBodies"))]
    if not valid_sides:
        return None

    for side in valid_sides:
        if normalize_side(side.get("side")) == "frente":
            return side
    return valid_sides[0]


def process_two_body_side(job: dict[str, Any], side: dict[str, Any]) -> list[dict[str, Any]]:
    source = side.get("source") if isinstance(side.get("source"), dict) else {}
    content_type = clean_text(source.get("contentType")) or "image/jpeg"
    app.logger.info(
        "Processing two-body DNI job_id=%s source_side=%s has_path=%s has_url=%s content_type=%s selected_area=%s",
        clean_text(job.get("jobId")) or "job",
        clean_text(side.get("side")) or "lado",
        bool(clean_text(source.get("path"))),
        bool(clean_text(source.get("url"))),
        content_type,
        normalize_area(side.get("selectedArea")),
    )

    content, bucket_name, source_path = download_source(source)
    image = decode_image(content, content_type, source_path, normalize_area(side.get("selectedArea")))
    processed_by_area, detection_mode = process_two_body_image(image)
    metadata_side_areas = area_by_output_side(side)
    side_areas = metadata_side_areas
    assignment_mode = "metadata_side_classification"
    assignment_diagnostics = {
        "metadataSideAreas": metadata_side_areas,
        "reason": "Gemini metadata is authoritative for two-body side assignment.",
    }
    outputs: list[dict[str, Any]] = []

    for side_name in ("frente", "reverso"):
        area = side_areas[side_name]
        output = upload_output(
            image=processed_by_area[area],
            bucket_name=bucket_name,
            job_id=clean_text(job.get("jobId")) or "job",
            dni=clean_text(job.get("dni")) or "documento",
            side_name=side_name,
        )
        outputs.append({
            "side": side_name,
            "sourceSide": clean_text(side.get("side")) or "lado",
            "sourcePath": source_path,
            "hasTwoBodies": True,
            "selectedArea": area,
            "detectionMode": detection_mode,
            "assignmentMode": assignment_mode,
            "assignmentDiagnostics": assignment_diagnostics,
            "output": output,
        })

    return outputs


def safe_slug(value: Any, fallback: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9_-]+", "-", clean_text(value)).strip("-")
    return slug or fallback


def upload_output(image: np.ndarray, bucket_name: str | None, job_id: str, dni: str, side_name: str) -> dict[str, str]:
    init_firebase()
    if bucket_name:
        bucket = storage.bucket(bucket_name)
    else:
        bucket = storage.bucket()

    ok, encoded = cv2.imencode(".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), 94])
    if not ok:
        raise RuntimeError("No se pudo codificar la imagen procesada.")

    path = f"{OUTPUT_PREFIX}/{safe_slug(dni, 'documento')}/{safe_slug(job_id, 'job')}-{safe_slug(side_name, 'lado')}.jpg"
    token = str(uuid.uuid4())
    blob = bucket.blob(path)
    blob.metadata = {"firebaseStorageDownloadTokens": token}
    blob.upload_from_string(encoded.tobytes(), content_type="image/jpeg")
    url = (
        f"https://firebasestorage.googleapis.com/v0/b/{bucket.name}/o/"
        f"{quote(path, safe='')}?alt=media&token={token}"
    )
    return {
        "path": path,
        "url": url,
        "contentType": "image/jpeg",
        "bucket": bucket.name,
    }


def process_side(job: dict[str, Any], side: dict[str, Any]) -> dict[str, Any]:
    source = side.get("source") if isinstance(side.get("source"), dict) else {}
    content_type = clean_text(source.get("contentType")) or "image/jpeg"
    app.logger.info(
        "Processing DNI side job_id=%s side=%s has_path=%s has_url=%s content_type=%s has_two_bodies=%s selected_area=%s",
        clean_text(job.get("jobId")) or "job",
        clean_text(side.get("side")) or "lado",
        bool(clean_text(source.get("path"))),
        bool(clean_text(source.get("url"))),
        content_type,
        bool(side.get("hasTwoBodies")),
        normalize_area(side.get("selectedArea")),
    )
    content, bucket_name, source_path = download_source(source)
    image = process_image(content, content_type, source_path, side)
    output = upload_output(
        image=image,
        bucket_name=bucket_name,
        job_id=clean_text(job.get("jobId")) or "job",
        dni=clean_text(job.get("dni")) or "documento",
        side_name=clean_text(side.get("side")) or "lado",
    )
    return {
        "side": clean_text(side.get("side")) or "lado",
        "sourcePath": source_path,
        "hasTwoBodies": bool(side.get("hasTwoBodies")),
        "selectedArea": normalize_area(side.get("selectedArea")),
        "output": output,
    }


@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.post("/")
def process_job():
    authorized, message = require_authorization()
    if not authorized:
        return jsonify({"status": "unauthorized", "message": message}), 401

    init_firebase()
    job = request.get_json(silent=True) or {}
    sides = job.get("sides") if isinstance(job.get("sides"), list) else []
    if not sides:
        return jsonify({"status": "rejected", "message": "El job no tiene lados para procesar."}), 400

    outputs: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    two_body_reference = select_two_body_reference(sides)
    if two_body_reference is not None:
        try:
            outputs.extend(process_two_body_side(job, two_body_reference))
        except Exception as exc:
            errors.append({
                "side": clean_text(two_body_reference.get("side")) or "lado",
                "message": str(exc),
            })
    else:
        for side in sides:
            if not isinstance(side, dict):
                continue
            try:
                outputs.append(process_side(job, side))
            except Exception as exc:
                errors.append({
                    "side": clean_text(side.get("side")) or "lado",
                    "message": str(exc),
                })

    status = "completed" if outputs and not errors else "partial" if outputs else "failed"
    http_status = 200 if outputs else 422
    if errors:
        app.logger.warning(
            "DNI processing finished with errors job_id=%s status=%s errors=%s",
            clean_text(job.get("jobId")),
            status,
            errors,
        )
    else:
        app.logger.info(
            "DNI processing completed job_id=%s outputs=%s",
            clean_text(job.get("jobId")),
            [
                {
                    "side": output.get("side"),
                    "path": (output.get("output") or {}).get("path"),
                }
                for output in outputs
            ],
        )
    return jsonify({
        "status": status,
        "jobId": clean_text(job.get("jobId")),
        "outputs": outputs,
        "errors": errors,
    }), http_status
