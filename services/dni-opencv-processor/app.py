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
DEFAULT_OUTPUT_WIDTH = 1015
DEFAULT_OUTPUT_HEIGHT = 640
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


def env_flag(name: str, default: bool = True) -> bool:
    fallback = "true" if default else "false"
    return clean_text(os.getenv(name, fallback)).lower() not in {"0", "false", "no", "off"}


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


def resize_for_document_detection(image: np.ndarray, max_side: int = 1280) -> tuple[np.ndarray, float]:
    height, width = image.shape[:2]
    current_max = max(height, width)
    if current_max <= 0 or current_max == max_side:
        return image.copy(), 1.0
    scale = max_side / current_max if current_max > max_side else 1.0
    if scale == 1.0:
        return image.copy(), 1.0
    resized = cv2.resize(
        image,
        (max(1, int(round(width * scale))), max(1, int(round(height * scale)))),
        interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC,
    )
    return resized, scale


def build_v2_edge_images(image: np.ndarray) -> list[tuple[str, np.ndarray, np.ndarray]]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    blurred = cv2.GaussianBlur(enhanced, (5, 5), 1.2)
    height, width = blurred.shape[:2]
    kernel_size = max(3, int(round(min(width, height) * 0.008)))
    if kernel_size % 2 == 0:
        kernel_size += 1
    close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
    dilate_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))

    results: list[tuple[str, np.ndarray, np.ndarray]] = []
    for low, high in ((20, 60), (35, 110), (60, 180)):
        edges = cv2.Canny(blurred, low, high, apertureSize=3, L2gradient=True)
        morph = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, close_kernel, iterations=2)
        morph = cv2.dilate(morph, dilate_kernel, iterations=1)
        results.append((f"canny_{low}_{high}", morph, edges))
    return results


def rect_dimensions(rect: np.ndarray) -> tuple[float, float, float]:
    top_width = float(np.linalg.norm(rect[1] - rect[0]))
    bottom_width = float(np.linalg.norm(rect[2] - rect[3]))
    right_height = float(np.linalg.norm(rect[2] - rect[1]))
    left_height = float(np.linalg.norm(rect[3] - rect[0]))
    rect_width = max(top_width, bottom_width)
    rect_height = max(left_height, right_height)
    ratio = rect_width / max(1.0, rect_height)
    return rect_width, rect_height, ratio if ratio >= 1 else 1 / ratio


def rect_polygon_area(rect: np.ndarray) -> float:
    return abs(float(cv2.contourArea(np.round(rect).astype(np.float32))))


def rect_edge_strength(edge_image: np.ndarray, rect: np.ndarray) -> float:
    mask = np.zeros(edge_image.shape[:2], dtype=np.uint8)
    points = np.round(rect).astype(np.int32)
    cv2.polylines(mask, [points], True, 255, max(2, int(min(edge_image.shape[:2]) * 0.004)))
    selected = edge_image[mask > 0]
    if selected.size == 0:
        return 0.0
    return float(np.count_nonzero(selected)) / float(selected.size)


def rect_border_touches(rect: np.ndarray, width: int, height: int, margin_ratio: float = 0.015) -> list[str]:
    x1, y1, x2, y2 = rect_bounds(rect)
    margin_x = width * margin_ratio
    margin_y = height * margin_ratio
    touches: list[str] = []
    if x1 <= margin_x:
        touches.append("izquierdo")
    if y1 <= margin_y:
        touches.append("superior")
    if x2 >= width - margin_x:
        touches.append("derecho")
    if y2 >= height - margin_y:
        touches.append("inferior")
    return touches


def clipped_document_border_factor(rect: np.ndarray, width: int, height: int, margin_ratio: float = 0.015) -> float:
    touches = rect_border_touches(rect, width, height, margin_ratio)
    if not touches:
        return 1.0

    rect_area = rect_polygon_area(rect)
    frame_area = max(1.0, float(width * height))
    area_ratio = rect_area / frame_area
    vertical_clip = "superior" in touches or "inferior" in touches

    if vertical_clip and area_ratio >= 0.16:
        return 1.14
    if area_ratio >= 0.28:
        return 1.08
    if area_ratio >= 0.10:
        return 1.0
    return 0.88


def is_nearly_frontal_rect(rect: np.ndarray, output_side: Any = None) -> bool:
    ordered = order_points(rect)
    top = ordered[1] - ordered[0]
    bottom = ordered[2] - ordered[3]
    left = ordered[3] - ordered[0]
    right = ordered[2] - ordered[1]
    top_width = max(1.0, float(np.linalg.norm(top)))
    bottom_width = max(1.0, float(np.linalg.norm(bottom)))
    left_height = max(1.0, float(np.linalg.norm(left)))
    right_height = max(1.0, float(np.linalg.norm(right)))

    def angle_degrees(vector: np.ndarray) -> float:
        return abs(float(np.degrees(np.arctan2(vector[1], vector[0]))))

    top_angle = min(angle_degrees(top), abs(180 - angle_degrees(top)))
    bottom_angle = min(angle_degrees(bottom), abs(180 - angle_degrees(bottom)))
    left_angle = abs(90 - angle_degrees(left))
    right_angle = abs(90 - angle_degrees(right))
    max_angle_error = max(top_angle, bottom_angle, left_angle, right_angle)
    width_delta = abs(top_width - bottom_width) / max(top_width, bottom_width)
    height_delta = abs(left_height - right_height) / max(left_height, right_height)
    polygon_area = rect_polygon_area(ordered)
    x1, y1, x2, y2 = rect_bounds(ordered)
    bounds_area = max(1.0, (x2 - x1) * (y2 - y1))
    bounds_fill = polygon_area / bounds_area

    side_name = normalize_side(output_side)
    if side_name == "frente":
        return max_angle_error <= 15.0 and width_delta <= 0.18 and height_delta <= 0.24 and bounds_fill >= 0.84
    return max_angle_error <= 7.5 and width_delta <= 0.08 and height_delta <= 0.10 and bounds_fill >= 0.93


def should_preserve_reverso_near_frontal_crop(rect: np.ndarray, image_width: int, image_height: int, output_side: Any = None) -> bool:
    if normalize_side(output_side) != "reverso":
        return False

    ordered = order_points(rect)
    top = ordered[1] - ordered[0]
    bottom = ordered[2] - ordered[3]
    left = ordered[3] - ordered[0]
    right = ordered[2] - ordered[1]
    top_width = max(1.0, float(np.linalg.norm(top)))
    bottom_width = max(1.0, float(np.linalg.norm(bottom)))
    left_height = max(1.0, float(np.linalg.norm(left)))
    right_height = max(1.0, float(np.linalg.norm(right)))

    def angle_degrees(vector: np.ndarray) -> float:
        return abs(float(np.degrees(np.arctan2(vector[1], vector[0]))))

    top_angle = min(angle_degrees(top), abs(180 - angle_degrees(top)))
    bottom_angle = min(angle_degrees(bottom), abs(180 - angle_degrees(bottom)))
    left_angle = abs(90 - angle_degrees(left))
    right_angle = abs(90 - angle_degrees(right))
    max_angle_error = max(top_angle, bottom_angle, left_angle, right_angle)
    width_delta = abs(top_width - bottom_width) / max(top_width, bottom_width)
    height_delta = abs(left_height - right_height) / max(left_height, right_height)
    polygon_area = rect_polygon_area(ordered)
    x1, y1, x2, y2 = rect_bounds(ordered)
    bounds_area = max(1.0, (x2 - x1) * (y2 - y1))
    frame_area = max(1.0, float(image_width * image_height))
    bounds_fill = polygon_area / bounds_area
    area_ratio = polygon_area / frame_area

    return (
        area_ratio >= 0.38
        and bounds_fill >= 0.91
        and max_angle_error <= 6.5
        and width_delta <= 0.13
        and height_delta <= 0.10
    )


def crop_nearly_frontal_document(image: np.ndarray, rect: np.ndarray) -> np.ndarray | None:
    height, width = image.shape[:2]
    x1, y1, x2, y2 = rect_bounds(rect)
    crop_width = x2 - x1
    crop_height = y2 - y1
    if crop_width < width * 0.35 or crop_height < height * 0.30:
        return None

    pad_x = max(3, int(crop_width * 0.007))
    pad_y = max(3, int(crop_height * 0.009))
    x1_i = max(0, int(np.floor(x1)) - pad_x)
    y1_i = max(0, int(np.floor(y1)) - pad_y)
    x2_i = min(width, int(np.ceil(x2)) + pad_x)
    y2_i = min(height, int(np.ceil(y2)) + pad_y)
    cropped = image[y1_i:y2_i, x1_i:x2_i]
    if cropped.size == 0:
        return None

    crop_height_px, crop_width_px = cropped.shape[:2]
    if crop_height_px <= 0 or crop_width_px <= 0:
        return None
    if crop_height_px > crop_width_px:
        cropped = cv2.rotate(cropped, cv2.ROTATE_90_CLOCKWISE)
        crop_height_px, crop_width_px = cropped.shape[:2]

    target_width = int(os.getenv("OUTPUT_WIDTH", str(DEFAULT_OUTPUT_WIDTH)))
    target_width = max(800, min(target_width, 2400))
    target_height = int(round(target_width * (crop_height_px / max(1, crop_width_px))))
    resized = cv2.resize(cropped, (target_width, max(1, target_height)), interpolation=cv2.INTER_CUBIC)
    app.logger.info(
        "Near-frontal DNI conservative crop used left=%s right=%s top=%s bottom=%s resized=%sx%s",
        x1_i,
        width - x2_i,
        y1_i,
        height - y2_i,
        resized.shape[1],
        resized.shape[0],
    )
    return trim_warped_document_margins(resized)


def collect_quadrilateral_candidates_v2(image: np.ndarray, limit: int) -> list[tuple[float, np.ndarray, str]]:
    resized, scale = resize_for_document_detection(image, 1280)
    height, width = resized.shape[:2]
    image_area = height * width
    candidates: list[tuple[float, np.ndarray, str]] = []

    for pass_name, morph, raw_edges in build_v2_edge_images(resized):
        contours, _ = cv2.findContours(morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:80]

        for contour in contours:
            contour_area = cv2.contourArea(contour)
            if contour_area < image_area * 0.025 or contour_area > image_area * 0.95:
                continue

            peri = cv2.arcLength(contour, True)
            if peri <= 0:
                continue

            for epsilon_ratio in (0.012, 0.020, 0.035):
                approx = cv2.approxPolyDP(contour, epsilon_ratio * peri, True)
                if len(approx) == 4:
                    rect = order_points(approx.reshape(4, 2).astype("float32"))
                else:
                    box = cv2.boxPoints(cv2.minAreaRect(contour))
                    if box is None or len(box) != 4:
                        continue
                    rect = order_points(box.astype("float32"))

                rect_width, rect_height, aspect_ratio = rect_dimensions(rect)
                if rect_width <= 1 or rect_height <= 1:
                    continue
                if not 1.35 <= aspect_ratio <= 1.90:
                    continue

                rect_area = rect_polygon_area(rect)
                rect_fraction = rect_area / max(1.0, float(image_area))
                if rect_fraction < 0.025 or rect_fraction > 0.95:
                    continue

                bounding_x, bounding_y, bounding_w, bounding_h = cv2.boundingRect(np.round(rect).astype(np.int32))
                bounding_area = max(1.0, float(bounding_w * bounding_h))
                rectangularity = rect_area / bounding_area
                if rectangularity < 0.75:
                    continue

                ratio_score = 1.0 - min(abs(aspect_ratio - DOCUMENT_RATIO) / DOCUMENT_RATIO, 1.0)
                area_score = min(rect_fraction / 0.42, 1.0)
                edge_score = rect_edge_strength(raw_edges, rect)
                border_factor = clipped_document_border_factor(rect, width, height)
                score = (
                    ratio_score * 3.4
                    + rectangularity * 2.5
                    + area_score * 1.7
                    + edge_score * 1.8
                    + min(contour_area / max(1.0, rect_area), 1.0)
                ) * border_factor
                candidates.append((score, rect / scale, f"{pass_name}_eps_{epsilon_ratio:.3f}"))

    result: list[tuple[float, np.ndarray, str]] = []
    for score, rect, source in sorted(candidates, key=lambda item: item[0], reverse=True):
        if any(rect_iou(rect, existing_rect) > 0.42 for _, existing_rect, _ in result):
            continue
        result.append((score, rect, source))
        if len(result) >= limit:
            break
    return result


def collect_hough_candidates_v2(image: np.ndarray, limit: int) -> list[tuple[float, np.ndarray, str]]:
    resized, scale = resize_for_document_detection(image, 1280)
    height, width = resized.shape[:2]
    edge_passes = build_v2_edge_images(resized)
    candidates: list[tuple[float, np.ndarray, str]] = []

    for pass_name, morph, _raw_edges in edge_passes:
        lines = cv2.HoughLinesP(
            morph,
            1,
            np.pi / 180,
            threshold=max(45, int(min(width, height) * 0.08)),
            minLineLength=max(80, int(min(width, height) * 0.28)),
            maxLineGap=max(12, int(min(width, height) * 0.035)),
        )
        if lines is None:
            continue

        points: list[list[int]] = []
        for line in lines[:80]:
            x1, y1, x2, y2 = line[0]
            length = float(np.hypot(x2 - x1, y2 - y1))
            if length < min(width, height) * 0.20:
                continue
            points.extend([[x1, y1], [x2, y2]])
        if len(points) < 8:
            continue

        points_array = np.array(points, dtype=np.float32)
        box = cv2.boxPoints(cv2.minAreaRect(points_array))
        rect = order_points(box.astype("float32"))
        rect_width, rect_height, aspect_ratio = rect_dimensions(rect)
        if not 1.35 <= aspect_ratio <= 1.90:
            continue
        rect_area = rect_polygon_area(rect)
        rect_fraction = rect_area / max(1.0, float(width * height))
        if rect_fraction < 0.025 or rect_fraction > 0.95:
            continue
        ratio_score = 1.0 - min(abs(aspect_ratio - DOCUMENT_RATIO) / DOCUMENT_RATIO, 1.0)
        score = ratio_score * 3.0 + min(rect_fraction / 0.42, 1.0) * 1.4
        candidates.append((score, rect / scale, f"hough_{pass_name}"))

    result: list[tuple[float, np.ndarray, str]] = []
    for score, rect, source in sorted(candidates, key=lambda item: item[0], reverse=True):
        if any(rect_iou(rect, existing_rect) > 0.42 for _, existing_rect, _ in result):
            continue
        result.append((score, rect, source))
        if len(result) >= limit:
            break
    return result


def odd_kernel(value: float, minimum: int = 3, maximum: int = 51) -> int:
    result = int(round(value))
    result = max(minimum, min(maximum, result))
    return result + 1 if result % 2 == 0 else result


def rect_perspective_score(rect: np.ndarray) -> float:
    ordered = order_points(rect)
    top = max(1.0, float(np.linalg.norm(ordered[1] - ordered[0])))
    bottom = max(1.0, float(np.linalg.norm(ordered[2] - ordered[3])))
    right = max(1.0, float(np.linalg.norm(ordered[2] - ordered[1])))
    left = max(1.0, float(np.linalg.norm(ordered[3] - ordered[0])))
    diagonal_a = max(1.0, float(np.linalg.norm(ordered[2] - ordered[0])))
    diagonal_b = max(1.0, float(np.linalg.norm(ordered[3] - ordered[1])))
    width_balance = min(top, bottom) / max(top, bottom)
    height_balance = min(left, right) / max(left, right)
    diagonal_balance = min(diagonal_a, diagonal_b) / max(diagonal_a, diagonal_b)
    return max(0.0, min(1.0, width_balance * 0.35 + height_balance * 0.35 + diagonal_balance * 0.30))


def rect_content_density(gray: np.ndarray, rect: np.ndarray) -> float:
    try:
        ordered = order_points(rect)
        destination = np.array(
            [
                [0, 0],
                [399, 0],
                [399, 251],
                [0, 251],
            ],
            dtype="float32",
        )
        matrix = cv2.getPerspectiveTransform(ordered, destination)
        warped_gray = cv2.warpPerspective(gray, matrix, (400, 252))
        height, width = warped_gray.shape[:2]
        if height < 40 or width < 70:
            return 0.0
        inner = warped_gray[int(height * 0.04): int(height * 0.96), int(width * 0.04): int(width * 0.96)]
        blurred = cv2.GaussianBlur(inner, (3, 3), 0.8)
        edges = cv2.Canny(blurred, 35, 110, apertureSize=3, L2gradient=True)
        return float(np.count_nonzero(edges)) / max(1.0, float(edges.size))
    except Exception:
        return 0.0


def build_ai_detection_maps(image: np.ndarray) -> tuple[list[tuple[str, np.ndarray, bool]], np.ndarray]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    minimum_dimension = min(gray.shape[:2])
    close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (odd_kernel(minimum_dimension * 0.008, 5, 17),) * 2)
    fill_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (odd_kernel(minimum_dimension * 0.025, 11, 41),) * 2)
    color_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (odd_kernel(minimum_dimension * 0.012, 7, 25),) * 2)
    dilate_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))

    edge_maps: list[tuple[str, np.ndarray, bool]] = []
    original_blurred = cv2.GaussianBlur(gray, (5, 5), 1.2)
    equalized_blurred = cv2.GaussianBlur(cv2.equalizeHist(gray), (5, 5), 1.2)
    for base_name, base in (("gray", original_blurred), ("equalized", equalized_blurred)):
        for low, high in ((20, 60), (35, 110), (60, 180)):
            edges = cv2.Canny(base, low, high, apertureSize=3, L2gradient=True)
            closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, close_kernel, iterations=2)
            dilated = cv2.dilate(closed, dilate_kernel, iterations=1)
            edge_maps.append((f"{base_name}_canny_{low}_{high}", dilated, False))

    union_edges = edge_maps[0][1].copy()
    for _name, edge_map, _color_mask in edge_maps[1:]:
        union_edges = cv2.bitwise_or(union_edges, edge_map)

    _threshold, otsu = cv2.threshold(original_blurred, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    _threshold, inverse_otsu = cv2.threshold(original_blurred, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)
    segmentation_maps: list[tuple[str, np.ndarray, bool]] = []
    for name, mask in (("otsu", otsu), ("inverse_otsu", inverse_otsu)):
        closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, fill_kernel, iterations=2)
        segmentation_maps.append((name, closed, False))

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    hue = hsv[:, :, 0]
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]
    saturation_blurred = cv2.medianBlur(saturation, 7)
    _threshold, saturation_mask = cv2.threshold(saturation_blurred, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    saturation_closed = cv2.morphologyEx(saturation_mask, cv2.MORPH_CLOSE, fill_kernel, iterations=2)
    segmentation_maps.append(("saturation", saturation_closed, False))

    cyan_hue = ((hue >= 77) & (hue <= 136)).astype(np.uint8) * 255
    chroma_gate = (saturation > 11).astype(np.uint8) * 255
    value_gate = (value > 125).astype(np.uint8) * 255
    cyan_mask = cv2.bitwise_and(cyan_hue, chroma_gate)
    cyan_mask = cv2.bitwise_and(cyan_mask, value_gate)
    cyan_closed = cv2.morphologyEx(cyan_mask, cv2.MORPH_CLOSE, color_kernel, iterations=2)
    segmentation_maps.append(("cyan", cyan_closed, True))

    return edge_maps + segmentation_maps, union_edges


def ai_candidate_score(
    area_ratio: float,
    aspect_ratio: float,
    rectangularity: float,
    edge_support: float,
    content_density: float,
    perspective_score: float,
    color_mask: bool,
    touches_border: bool,
) -> float:
    aspect_score = 1.0 - min(abs(aspect_ratio - DOCUMENT_RATIO) / DOCUMENT_RATIO, 1.0)
    area_score = max(0.0, min(1.0, np.sqrt(area_ratio / 0.25)))
    content_score = max(0.0, min(1.0, (content_density - 0.02) / 0.14))
    score = (
        aspect_score * 0.33
        + edge_support * 0.25
        + rectangularity * 0.14
        + perspective_score * 0.10
        + area_score * 0.08
        + content_score * 0.10
    )
    if color_mask:
        score += 0.035
    if touches_border:
        if area_ratio >= 0.16:
            score += 0.06
        elif area_ratio < 0.08:
            score -= 0.06
    if area_ratio > 0.88:
        score -= 0.08
    return max(0.0, min(1.0, score))


def evaluate_ai_rect(
    rect: np.ndarray,
    contour_area: float,
    union_edges: np.ndarray,
    gray: np.ndarray,
    color_mask: bool,
) -> tuple[float, np.ndarray, dict[str, float]] | None:
    height, width = union_edges.shape[:2]
    rect = order_points(rect.astype("float32"))
    rect_area = rect_polygon_area(rect)
    frame_area = max(1.0, float(width * height))
    area_ratio = rect_area / frame_area
    if area_ratio < 0.015 or area_ratio > 0.96:
        return None

    rect_width, rect_height, aspect_ratio = rect_dimensions(rect)
    if min(rect_width, rect_height) < min(width, height) * 0.10:
        return None
    if not 1.08 <= aspect_ratio <= 2.05:
        return None

    outside_allowance = min(width, height) * 0.04
    if np.any(rect[:, 0] < -outside_allowance) or np.any(rect[:, 1] < -outside_allowance):
        return None
    if np.any(rect[:, 0] > width + outside_allowance) or np.any(rect[:, 1] > height + outside_allowance):
        return None

    rectangularity = max(0.0, min(1.0, contour_area / max(rect_area, 1.0)))
    edge_support = rect_edge_strength(union_edges, rect)
    perspective_score = rect_perspective_score(rect)
    content_density = rect_content_density(gray, rect)
    touches_border = bool(rect_border_touches(rect, width, height, 0.012))
    score = ai_candidate_score(
        area_ratio,
        aspect_ratio,
        rectangularity,
        edge_support,
        content_density,
        perspective_score,
        color_mask,
        touches_border,
    )
    if score < 0.40:
        return None
    return score, rect, {
        "areaRatio": area_ratio,
        "aspectRatio": aspect_ratio,
        "rectangularity": rectangularity,
        "edgeSupport": edge_support,
        "contentDensity": content_density,
        "perspectiveScore": perspective_score,
    }


def collect_ai_detector_candidates(image: np.ndarray, limit: int) -> list[tuple[float, np.ndarray, str]]:
    resized, scale = resize_for_document_detection(image, 1600)
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    maps, union_edges = build_ai_detection_maps(resized)
    frame_area = max(1.0, float(resized.shape[0] * resized.shape[1]))
    candidates: list[tuple[float, np.ndarray, str]] = []

    for map_name, mask, color_mask in maps:
        contours, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:120]
        include_polygon = map_name in {"otsu", "inverse_otsu"} or "canny" in map_name
        minimum_rect_fill = 0.18 if color_mask else 0.45

        for contour in contours:
            contour_area = float(cv2.contourArea(contour))
            if contour_area < frame_area * 0.015 * 0.30 or contour_area > frame_area * 0.96 * 1.05:
                continue
            perimeter = cv2.arcLength(contour, True)
            if perimeter <= 0:
                continue

            if include_polygon:
                for epsilon_ratio in (0.012, 0.020, 0.035):
                    approx = cv2.approxPolyDP(contour, epsilon_ratio * perimeter, True)
                    if len(approx) != 4 or not cv2.isContourConvex(approx):
                        continue
                    evaluated = evaluate_ai_rect(
                        approx.reshape(4, 2).astype("float32"),
                        contour_area,
                        union_edges,
                        gray,
                        color_mask,
                    )
                    if evaluated:
                        score, rect, _metrics = evaluated
                        candidates.append((score, rect / scale, f"ai_{map_name}_poly_{epsilon_ratio:.3f}"))

            box = cv2.boxPoints(cv2.minAreaRect(contour))
            if box is None or len(box) != 4:
                continue
            rectangle_area = max(1.0, float(cv2.contourArea(box.astype(np.float32))))
            if contour_area / rectangle_area < minimum_rect_fill:
                continue
            evaluated = evaluate_ai_rect(
                box.astype("float32"),
                min(contour_area, rectangle_area),
                union_edges,
                gray,
                color_mask,
            )
            if evaluated:
                score, rect, _metrics = evaluated
                candidates.append((score - 0.035, rect / scale, f"ai_{map_name}_min_rect"))

    if max(resized.shape[:2]) <= 400 and any(rect_polygon_area(rect) / frame_area >= 0.70 for _score, rect, _source in candidates):
        inset = max(1, int(round(min(resized.shape[:2]) * 0.016)))
        frame_rect = np.array(
            [
                [inset, inset],
                [resized.shape[1] - 1 - inset, inset],
                [resized.shape[1] - 1 - inset, resized.shape[0] - 1 - inset],
                [inset, resized.shape[0] - 1 - inset],
            ],
            dtype="float32",
        )
        evaluated = evaluate_ai_rect(frame_rect, rect_polygon_area(frame_rect) * 0.96, union_edges, gray, False)
        if evaluated:
            score, rect, _metrics = evaluated
            candidates.append((score, rect / scale, "ai_low_resolution_full_frame"))

    deduplicated: list[tuple[float, np.ndarray, str]] = []
    for score, rect, source in sorted(candidates, key=lambda item: item[0], reverse=True):
        duplicate_index = next((index for index, (_existing_score, existing_rect, _existing_source) in enumerate(deduplicated) if rect_iou(rect, existing_rect) >= 0.86), None)
        if duplicate_index is None:
            deduplicated.append((score, rect, source))
        elif score > deduplicated[duplicate_index][0]:
            deduplicated[duplicate_index] = (score, rect, source)

    selected: list[tuple[float, np.ndarray, str]] = []
    for score, rect, source in sorted(deduplicated, key=lambda item: item[0], reverse=True):
        if score < 0.48:
            continue
        area_ratio = rect_polygon_area(rect) / frame_area
        if limit <= 1 and area_ratio < 0.08:
            app.logger.info(
                "DNI AI detector skipped small single-body candidate source=%s score=%.3f area_ratio=%.4f",
                source,
                score,
                area_ratio,
            )
            continue
        if any(rect_iou(rect, existing_rect) > 0.25 for _existing_score, existing_rect, _existing_source in selected):
            continue
        if selected:
            primary_area = rect_polygon_area(selected[0][1])
            relative_area = rect_polygon_area(rect) / max(primary_area, 1.0)
            if relative_area < 0.40 or relative_area > 2.50:
                continue
            if score < selected[0][0] - 0.18:
                continue
        selected.append((score, rect, source))
        if len(selected) >= limit:
            break

    return selected


def find_document_contours_ai(image: np.ndarray, limit: int = 1) -> list[np.ndarray]:
    candidates = collect_ai_detector_candidates(image, limit)
    if candidates:
        app.logger.info(
            "DNI AI detector selected %s candidate(s): %s",
            len(candidates),
            [
                {
                    "score": round(score, 3),
                    "source": source,
                    "bounds": tuple(round(value, 1) for value in rect_bounds(rect)),
                }
                for score, rect, source in candidates
            ],
        )
    return [rect for _score, rect, _source in candidates]


def find_document_contours_v2(image: np.ndarray, limit: int = 1) -> list[np.ndarray]:
    height, width = image.shape[:2]
    candidates = collect_quadrilateral_candidates_v2(image, limit)
    if len(candidates) < limit:
        candidates.extend(collect_hough_candidates_v2(image, limit))

    result: list[tuple[float, np.ndarray, str]] = []
    for score, rect, source in sorted(candidates, key=lambda item: item[0], reverse=True):
        if any(rect_iou(rect, existing_rect) > 0.42 for _, existing_rect, _ in result):
            continue
        touches = rect_border_touches(rect, width, height)
        if touches:
            app.logger.warning(
                "DNI candidate touches image border sides=%s source=%s score=%.3f",
                ",".join(touches),
                source,
                score,
            )
        result.append((score, rect, source))
        if len(result) >= limit:
            break

    if result:
        app.logger.info(
            "DNI V2 selected %s candidate(s): %s",
            len(result),
            [
                {
                    "score": round(score, 3),
                    "source": source,
                    "bounds": tuple(round(value, 1) for value in rect_bounds(rect)),
                }
                for score, rect, source in result
            ],
        )
    return [rect for _, rect, _ in result]


def should_prefer_border_clipped_candidate(
    primary_rect: np.ndarray,
    alternative_rect: np.ndarray,
    image_width: int,
    image_height: int,
) -> bool:
    frame_area = max(1.0, float(image_width * image_height))
    primary_area = rect_polygon_area(primary_rect)
    alternative_area = rect_polygon_area(alternative_rect)
    primary_area_ratio = primary_area / frame_area
    alternative_area_ratio = alternative_area / frame_area
    if primary_area_ratio < 0.62 or alternative_area_ratio < 0.16:
        return False
    if alternative_area_ratio >= primary_area_ratio * 0.78:
        return False

    primary_touches = set(rect_border_touches(primary_rect, image_width, image_height, 0.012))
    alternative_touches = set(rect_border_touches(alternative_rect, image_width, image_height, 0.012))
    primary_side_clipped = {"izquierdo", "derecho"}.issubset(primary_touches)
    primary_frame_like = primary_side_clipped and bool(primary_touches & {"superior", "inferior"})
    if not primary_frame_like:
        return False

    alternative_side_clipped = {"izquierdo", "derecho"}.issubset(alternative_touches)
    alternative_vertical_touch_count = len(alternative_touches & {"superior", "inferior"})
    if not alternative_side_clipped or alternative_vertical_touch_count:
        return False

    primary_height = rect_bounds(primary_rect)[3] - rect_bounds(primary_rect)[1]
    alternative_height = rect_bounds(alternative_rect)[3] - rect_bounds(alternative_rect)[1]
    if alternative_height >= primary_height * 0.74:
        return False

    _alt_width, _alt_height, alternative_ratio = rect_dimensions(alternative_rect)
    if not 1.30 <= alternative_ratio <= 1.95:
        return False

    return True


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

    yellow_card = ((hsv[:, :, 0] >= 14) & (hsv[:, :, 0] <= 50) & (saturation > 28) & (value > 55) & (value < 252)).astype(np.uint8) * 255
    yellow_card = cv2.morphologyEx(yellow_card, cv2.MORPH_CLOSE, close_kernel, iterations=2)
    yellow_card = cv2.morphologyEx(yellow_card, cv2.MORPH_OPEN, open_kernel, iterations=1)
    yellow_card = cv2.dilate(yellow_card, np.ones((5, 5), np.uint8), iterations=1)

    color_card = ((saturation > 24) & (value > 45) & (value < 252)).astype(np.uint8) * 255
    color_card = cv2.morphologyEx(color_card, cv2.MORPH_CLOSE, close_kernel, iterations=2)
    color_card = cv2.morphologyEx(color_card, cv2.MORPH_OPEN, open_kernel, iterations=1)
    color_card = cv2.dilate(color_card, np.ones((5, 5), np.uint8), iterations=1)

    non_white = ((gray < 248) | (saturation > 16)).astype(np.uint8) * 255
    foreground = cv2.morphologyEx(non_white, cv2.MORPH_CLOSE, close_kernel, iterations=2)
    foreground = cv2.morphologyEx(foreground, cv2.MORPH_OPEN, open_kernel, iterations=1)
    foreground = cv2.dilate(foreground, np.ones((5, 5), np.uint8), iterations=1)

    return [("blue_card", blue_card), ("yellow_card", yellow_card), ("color_card", color_card), ("foreground", foreground), ("edges", edges)]


def rect_mask_fill_ratio(mask: np.ndarray, rect: np.ndarray) -> float:
    polygon = np.zeros(mask.shape[:2], dtype=np.uint8)
    cv2.fillConvexPoly(polygon, np.round(rect).astype(np.int32), 255)
    polygon_area = max(1, int(np.count_nonzero(polygon)))
    filled_area = int(np.count_nonzero(cv2.bitwise_and(mask, polygon)))
    return filled_area / polygon_area


def border_touch_penalty(rect: np.ndarray, image_width: int, image_height: int) -> float:
    return clipped_document_border_factor(rect, image_width, image_height, 0.018)


def shrink_wide_rect_to_document_ratio(rect: np.ndarray, image_width: int) -> np.ndarray:
    width_a = np.linalg.norm(rect[2] - rect[3])
    width_b = np.linalg.norm(rect[1] - rect[0])
    height_a = np.linalg.norm(rect[1] - rect[2])
    height_b = np.linalg.norm(rect[0] - rect[3])
    source_width = max(width_a, width_b)
    source_height = max(height_a, height_b)
    if source_height <= 1:
        return rect

    normalized_ratio = source_width / source_height
    if normalized_ratio <= DOCUMENT_RATIO * 1.14:
        return rect

    target_width = source_height * DOCUMENT_RATIO
    if target_width >= source_width:
        return rect

    x1, _y1, x2, _y2 = rect_bounds(rect)
    right_touches_image = x2 >= image_width * 0.985
    left_touches_image = x1 <= image_width * 0.015

    top_width = max(1.0, np.linalg.norm(rect[1] - rect[0]))
    bottom_width = max(1.0, np.linalg.norm(rect[2] - rect[3]))
    top_scale = min(1.0, target_width / top_width)
    bottom_scale = min(1.0, target_width / bottom_width)
    adjusted = rect.copy()

    if right_touches_image and not left_touches_image:
        adjusted[1] = adjusted[0] + (rect[1] - rect[0]) * top_scale
        adjusted[2] = adjusted[3] + (rect[2] - rect[3]) * bottom_scale
        return adjusted

    if left_touches_image and not right_touches_image:
        adjusted[0] = adjusted[1] - (rect[1] - rect[0]) * top_scale
        adjusted[3] = adjusted[2] - (rect[2] - rect[3]) * bottom_scale
        return adjusted

    top_trim = (1.0 - top_scale) / 2.0
    bottom_trim = (1.0 - bottom_scale) / 2.0
    adjusted[0] = rect[0] + (rect[1] - rect[0]) * top_trim
    adjusted[1] = rect[1] - (rect[1] - rect[0]) * top_trim
    adjusted[3] = rect[3] + (rect[2] - rect[3]) * bottom_trim
    adjusted[2] = rect[2] - (rect[2] - rect[3]) * bottom_trim
    return adjusted


def shrink_low_quality_wide_rect_to_document_ratio(rect: np.ndarray, image_width: int) -> np.ndarray:
    width_a = np.linalg.norm(rect[2] - rect[3])
    width_b = np.linalg.norm(rect[1] - rect[0])
    height_a = np.linalg.norm(rect[1] - rect[2])
    height_b = np.linalg.norm(rect[0] - rect[3])
    source_width = max(width_a, width_b)
    source_height = max(height_a, height_b)
    if source_height <= 1:
        return rect

    normalized_ratio = source_width / source_height
    if normalized_ratio <= DOCUMENT_RATIO * 1.045:
        return rect

    target_width = source_height * DOCUMENT_RATIO
    if target_width >= source_width:
        return rect

    top_width = max(1.0, np.linalg.norm(rect[1] - rect[0]))
    bottom_width = max(1.0, np.linalg.norm(rect[2] - rect[3]))
    top_scale = min(1.0, target_width / top_width)
    bottom_scale = min(1.0, target_width / bottom_width)
    top_trim = (1.0 - top_scale) / 2.0
    bottom_trim = (1.0 - bottom_scale) / 2.0
    adjusted = rect.copy()
    adjusted[0] = rect[0] + (rect[1] - rect[0]) * top_trim
    adjusted[1] = rect[1] - (rect[1] - rect[0]) * top_trim
    adjusted[3] = rect[3] + (rect[2] - rect[3]) * bottom_trim
    adjusted[2] = rect[2] - (rect[2] - rect[3]) * bottom_trim
    app.logger.info(
        "Low-quality DNI wide-rect shrink ratio=%.3f target_ratio=%.3f",
        normalized_ratio,
        DOCUMENT_RATIO,
    )
    return adjusted


def trim_low_quality_blank_side_margins(image: np.ndarray, rect: np.ndarray) -> tuple[np.ndarray, bool]:
    x1, y1, x2, y2 = rect_bounds(rect)
    image_height, image_width = image.shape[:2]
    x1_i = int(round(max(0, min(image_width - 1, x1))))
    x2_i = int(round(max(0, min(image_width - 1, x2))))
    y1_i = int(round(max(0, min(image_height - 1, y1))))
    y2_i = int(round(max(0, min(image_height - 1, y2))))
    if x2_i <= x1_i or y2_i <= y1_i:
        return rect, False

    roi = image[y1_i:y2_i, x1_i:x2_i]
    if roi.size == 0:
        return rect, False

    roi_height, roi_width = roi.shape[:2]
    if roi_width < 120 or roi_height < 60:
        return rect, False

    inner_y1 = int(roi_height * 0.08)
    inner_y2 = max(inner_y1 + 1, int(roi_height * 0.92))
    roi_inner = roi[inner_y1:inner_y2, :]
    hsv = cv2.cvtColor(roi_inner, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(roi_inner, cv2.COLOR_BGR2GRAY)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]
    content_mask = ((gray < 232) | ((saturation > 14) & (value < 248))).astype(np.uint8)
    densities = content_mask.mean(axis=0).astype(np.float32)
    if densities.size < 10:
        return rect, False

    kernel = max(5, int(roi_width * 0.018))
    if kernel % 2 == 0:
        kernel += 1
    smoothed = cv2.GaussianBlur(densities.reshape(1, -1), (kernel, 1), 0).reshape(-1)
    threshold = max(0.025, float(np.percentile(smoothed, 75)) * 0.35)
    active = np.where(smoothed > threshold)[0]
    if active.size == 0:
        return rect, False

    left_index = int(active[0])
    right_index = int(active[-1])
    max_trim = int(roi_width * 0.075)
    min_trim = max(3, int(roi_width * 0.018))
    left_trim = min(max_trim, max(0, left_index - int(roi_width * 0.006)))
    right_trim = min(max_trim, max(0, roi_width - 1 - right_index - int(roi_width * 0.006)))
    if left_trim < min_trim:
        left_trim = 0
    if right_trim < min_trim:
        right_trim = 0
    if not left_trim and not right_trim:
        return rect, False

    adjusted = rect.copy()
    top_vector = rect[1] - rect[0]
    bottom_vector = rect[2] - rect[3]
    top_width = max(1.0, float(np.linalg.norm(top_vector)))
    bottom_width = max(1.0, float(np.linalg.norm(bottom_vector)))
    top_left_fraction = left_trim / top_width
    top_right_fraction = right_trim / top_width
    bottom_left_fraction = left_trim / bottom_width
    bottom_right_fraction = right_trim / bottom_width
    adjusted[0] = rect[0] + top_vector * top_left_fraction
    adjusted[1] = rect[1] - top_vector * top_right_fraction
    adjusted[3] = rect[3] + bottom_vector * bottom_left_fraction
    adjusted[2] = rect[2] - bottom_vector * bottom_right_fraction
    adjusted[:, 0] = np.clip(adjusted[:, 0], 0, image_width - 1)
    adjusted[:, 1] = np.clip(adjusted[:, 1], 0, image_height - 1)
    app.logger.info(
        "Low-quality DNI blank side trim left=%s right=%s threshold=%.4f",
        left_trim,
        right_trim,
        threshold,
    )
    return adjusted, True


def side_edge_expansion(
    gray: np.ndarray,
    rect: np.ndarray,
    side: str,
    max_expand: int,
) -> int:
    x1, y1, x2, y2 = rect_bounds(rect)
    image_height, image_width = gray.shape[:2]
    x1_i = int(round(max(0, min(image_width - 1, x1))))
    x2_i = int(round(max(0, min(image_width - 1, x2))))
    y1_i = int(round(max(0, min(image_height - 1, y1))))
    y2_i = int(round(max(0, min(image_height - 1, y2))))
    if x2_i <= x1_i or y2_i <= y1_i or max_expand <= 2:
        return 0

    vertical_margin = max(3, int((y2_i - y1_i) * 0.10))
    y_start = min(y2_i, y1_i + vertical_margin)
    y_end = max(y_start + 1, y2_i - vertical_margin)
    if y_end <= y_start:
        return 0

    if side == "left":
        search_start = max(0, x1_i - max_expand)
        search_end = x1_i + 1
    else:
        search_start = x2_i
        search_end = min(image_width, x2_i + max_expand + 1)
    if search_end - search_start < 4:
        return 0

    strip = gray[y_start:y_end, search_start:search_end]
    if strip.size == 0:
        return 0

    sobel = cv2.Sobel(strip, cv2.CV_32F, 1, 0, ksize=3)
    scores = np.mean(np.abs(sobel), axis=0)
    if scores.size < 3:
        return 0

    scores = cv2.GaussianBlur(scores.reshape(1, -1), (1, 5), 0).reshape(-1)
    median = float(np.median(scores))
    stddev = float(np.std(scores))
    threshold = max(6.0, median + stddev * 0.65)
    best_index = int(np.argmax(scores))
    best_score = float(scores[best_index])
    if best_score < threshold:
        return 0

    edge_x = search_start + best_index
    if side == "left":
        expansion = x1_i - edge_x
    else:
        expansion = edge_x - x2_i
    if expansion < 2:
        return 0
    return min(max_expand, expansion + 2)


def expand_rect_horizontally(
    rect: np.ndarray,
    left_expand: float,
    right_expand: float,
    image_width: int,
    image_height: int,
) -> np.ndarray:
    adjusted = rect.copy()

    top_vector = rect[1] - rect[0]
    bottom_vector = rect[2] - rect[3]
    top_width = max(1.0, float(np.linalg.norm(top_vector)))
    bottom_width = max(1.0, float(np.linalg.norm(bottom_vector)))
    top_unit = top_vector / top_width
    bottom_unit = bottom_vector / bottom_width

    adjusted[0] = adjusted[0] - top_unit * left_expand
    adjusted[3] = adjusted[3] - bottom_unit * left_expand
    adjusted[1] = adjusted[1] + top_unit * right_expand
    adjusted[2] = adjusted[2] + bottom_unit * right_expand
    adjusted[:, 0] = np.clip(adjusted[:, 0], 0, image_width - 1)
    adjusted[:, 1] = np.clip(adjusted[:, 1], 0, image_height - 1)
    return adjusted


def expand_rect_before_warp_for_side(
    rect: np.ndarray,
    image_width: int,
    image_height: int,
    output_side: Any,
) -> np.ndarray:
    side_name = normalize_side(output_side)
    if side_name not in {"frente", "reverso"}:
        return rect

    ordered = order_points(rect)
    top_vector = ordered[1] - ordered[0]
    bottom_vector = ordered[2] - ordered[3]
    left_vector = ordered[3] - ordered[0]
    right_vector = ordered[2] - ordered[1]
    top_width = max(1.0, float(np.linalg.norm(top_vector)))
    bottom_width = max(1.0, float(np.linalg.norm(bottom_vector)))
    left_height = max(1.0, float(np.linalg.norm(left_vector)))
    right_height = max(1.0, float(np.linalg.norm(right_vector)))

    if side_name == "frente":
        horizontal_expand = min(max(top_width, bottom_width) * 0.026, image_width * 0.023, 32)
        vertical_expand = min(max(left_height, right_height) * 0.030, image_height * 0.026, 26)
    else:
        horizontal_expand = min(max(top_width, bottom_width) * 0.023, image_width * 0.020, 27)
        vertical_expand = min(max(left_height, right_height) * 0.026, image_height * 0.023, 24)
    top_unit = top_vector / top_width
    bottom_unit = bottom_vector / bottom_width
    left_unit = left_vector / left_height
    right_unit = right_vector / right_height

    adjusted = ordered.copy()
    adjusted[0] = adjusted[0] - top_unit * horizontal_expand - left_unit * vertical_expand
    adjusted[1] = adjusted[1] + top_unit * horizontal_expand - right_unit * vertical_expand
    adjusted[2] = adjusted[2] + bottom_unit * horizontal_expand + right_unit * vertical_expand
    adjusted[3] = adjusted[3] - bottom_unit * horizontal_expand + left_unit * vertical_expand
    adjusted[:, 0] = np.clip(adjusted[:, 0], 0, image_width - 1)
    adjusted[:, 1] = np.clip(adjusted[:, 1], 0, image_height - 1)
    app.logger.info(
        "Pre-warp %s DNI rect expansion horizontal=%.1f vertical=%.1f",
        side_name,
        horizontal_expand,
        vertical_expand,
    )
    return adjusted


def refine_low_quality_side_margins(image: np.ndarray, rect: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1]
    mean_saturation = float(np.mean(saturation))
    p90_saturation = float(np.percentile(saturation, 90))
    if mean_saturation > 42 or p90_saturation > 92:
        return rect

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    x1, _y1, x2, _y2 = rect_bounds(rect)
    rect_width = max(1.0, x2 - x1)
    image_height, image_width = image.shape[:2]
    if rect_width < image_width * 0.25:
        return rect

    rect = shrink_low_quality_wide_rect_to_document_ratio(rect, image_width)
    rect, trimmed_blank_sides = trim_low_quality_blank_side_margins(image, rect)
    x1, _y1, x2, _y2 = rect_bounds(rect)
    rect_width = max(1.0, x2 - x1)
    max_expand = int(max(5, min(rect_width * 0.026, image_width * 0.034, 42)))
    left_expand = side_edge_expansion(gray, rect, "left", max_expand)
    right_expand = side_edge_expansion(gray, rect, "right", max_expand)

    if not trimmed_blank_sides and not left_expand and x1 > image_width * 0.025:
        left_expand = int(rect_width * 0.008)
    if not trimmed_blank_sides and not right_expand and x2 < image_width * 0.975:
        right_expand = int(rect_width * 0.008)

    if not left_expand and not right_expand:
        return rect

    refined = expand_rect_horizontally(rect, left_expand, right_expand, image_width, image_height)
    app.logger.info(
        "Low-quality DNI side-margin refinement mean_sat=%.2f p90_sat=%.2f left=%s right=%s",
        mean_saturation,
        p90_saturation,
        left_expand,
        right_expand,
    )
    return refined


def find_document_contours(image: np.ndarray, limit: int = 1) -> list[np.ndarray]:
    ai_contours = find_document_contours_ai(image, limit)
    if len(ai_contours) >= limit:
        if limit == 1:
            v2_contours = find_document_contours_v2(image, 2)
            replacement = next(
                (
                    rect
                    for rect in v2_contours
                    if should_prefer_border_clipped_candidate(
                        ai_contours[0],
                        rect,
                        image.shape[1],
                        image.shape[0],
                    )
                ),
                None,
            )
            if replacement is not None:
                app.logger.warning(
                    "DNI detector replaced frame-like AI contour bounds=%s with border-clipped V2 contour bounds=%s",
                    tuple(round(value, 1) for value in rect_bounds(ai_contours[0])),
                    tuple(round(value, 1) for value in rect_bounds(replacement)),
                )
                return [replacement]
        return ai_contours

    v2_contours = find_document_contours_v2(image, limit)
    if len(v2_contours) >= limit:
        return v2_contours

    height, width = image.shape[:2]
    scale = 1200 / max(height, width) if max(height, width) > 1200 else 1.0
    resized = cv2.resize(image, (int(width * scale), int(height * scale)))
    image_area = resized.shape[0] * resized.shape[1]
    min_area_fraction = 0.055 if limit > 1 else 0.085
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
            if mask_name == "yellow_card":
                rect = shrink_wide_rect_to_document_ratio(rect, resized.shape[1])
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
            max_ratio = 2.35 if mask_name == "yellow_card" else 1.82
            if not 1.35 <= normalized_ratio <= max_ratio:
                continue

            fill_ratio = contour_area / rect_area
            if mask_name in {"color_card", "foreground"} and fill_ratio < 0.20:
                continue

            color_fill_ratio = rect_mask_fill_ratio(color_mask, rect)
            if mask_name == "color_card" and color_fill_ratio < 0.12:
                continue
            if mask_name == "yellow_card" and color_fill_ratio < 0.10:
                continue
            if mask_name == "blue_card" and color_fill_ratio < 0.09:
                continue
            if mask_name != "color_card" and color_fill_ratio < 0.055:
                continue

            ratio_score = 1.0 - min(abs(normalized_ratio - DOCUMENT_RATIO) / DOCUMENT_RATIO, 1.0)
            area_score = min(rect_fraction / 0.20, 1.0)
            mask_bonus = 1.2 if mask_name == "blue_card" else 1.05 if mask_name == "yellow_card" else 0.85 if mask_name == "color_card" else 0.35 if mask_name == "foreground" else 0.0
            color_bonus = min(color_fill_ratio * 2.4, 1.65)
            border_penalty = border_touch_penalty(rect, resized.shape[1], resized.shape[0])
            score = contour_area * (1.0 + ratio_score + area_score + mask_bonus + color_bonus) * border_penalty
            candidates.append((score, rect / scale))

    result: list[np.ndarray] = []
    for rect in ai_contours:
        result.append(rect)

    for rect in v2_contours:
        if not any(rect_iou(rect, existing) > 0.45 for existing in result):
            result.append(rect)

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


def _trim_axis_from_density(
    density: np.ndarray,
    length: int,
    label: str,
) -> tuple[int, int]:
    if density.size < 10 or length <= 0:
        return 0, length

    kernel = max(5, int(length * 0.018))
    if kernel % 2 == 0:
        kernel += 1
    smoothed = cv2.GaussianBlur(density.reshape(1, -1), (kernel, 1), 0).reshape(-1)
    p80 = float(np.percentile(smoothed, 80))
    p95 = float(np.percentile(smoothed, 95))
    threshold = max(0.012, p80 * 0.34, p95 * 0.18)
    active = np.where(smoothed > threshold)[0]
    if active.size == 0:
        return 0, length

    padding = max(1, int(length * 0.006))
    start = max(0, int(active[0]) - padding)
    end = min(length, int(active[-1]) + padding + 1)
    max_trim = int(length * 0.18)
    if start > max_trim:
        start = 0
    if length - end > max_trim:
        end = length
    if end - start < length * 0.68:
        return 0, length

    app.logger.info(
        "Post-warp DNI %s trim start=%s end=%s threshold=%.4f p80=%.4f p95=%.4f",
        label,
        start,
        end,
        threshold,
        p80,
        p95,
    )
    return start, end


def _find_vertical_document_edge(
    gray: np.ndarray,
    side: str,
) -> int | None:
    height, width = gray.shape[:2]
    if width < 300 or height < 180:
        return None

    y1 = int(height * 0.08)
    y2 = max(y1 + 1, int(height * 0.92))
    if side == "left":
        x1 = int(width * 0.015)
        x2 = int(width * 0.420)
    else:
        x1 = int(width * 0.580)
        x2 = int(width * 0.985)
    if x2 - x1 < 12:
        return None

    roi = gray[y1:y2, x1:x2]
    roi = cv2.GaussianBlur(roi, (3, 3), 0)
    sobel = np.abs(cv2.Sobel(roi, cv2.CV_32F, 1, 0, ksize=3))
    if sobel.size == 0:
        return None

    pixel_threshold = max(8.0, float(np.percentile(sobel, 82)))
    strong = sobel > pixel_threshold
    continuity = strong.mean(axis=0)
    strength = sobel.mean(axis=0)
    score = strength * (1.0 + continuity * 5.0)
    if score.size < 5:
        return None

    kernel = 5 if score.size >= 5 else 3
    if kernel % 2 == 0:
        kernel += 1
    score = cv2.GaussianBlur(score.reshape(1, -1), (kernel, 1), 0).reshape(-1)
    best_index = int(np.argmax(score))
    best_score = float(score[best_index])
    score_floor = max(float(np.percentile(score, 78)) * 1.10, float(np.median(score)) + float(np.std(score)) * 0.95, 5.5)
    continuity_floor = 0.10
    if best_score < score_floor or float(continuity[best_index]) < continuity_floor:
        return None

    edge = x1 + best_index
    min_trim = int(width * 0.018)
    max_trim = int(width * 0.380)
    trim = edge if side == "left" else width - edge
    if trim < min_trim or trim > max_trim:
        return None

    return edge


def _find_horizontal_document_edge(
    gray: np.ndarray,
    side: str,
) -> int | None:
    height, width = gray.shape[:2]
    if width < 300 or height < 180:
        return None

    x1 = int(width * 0.06)
    x2 = max(x1 + 1, int(width * 0.94))
    if side == "top":
        y1 = int(height * 0.015)
        y2 = int(height * 0.420)
    else:
        y1 = int(height * 0.580)
        y2 = int(height * 0.985)
    if y2 - y1 < 12:
        return None

    roi = gray[y1:y2, x1:x2]
    roi = cv2.GaussianBlur(roi, (3, 3), 0)
    sobel = np.abs(cv2.Sobel(roi, cv2.CV_32F, 0, 1, ksize=3))
    if sobel.size == 0:
        return None

    pixel_threshold = max(8.0, float(np.percentile(sobel, 82)))
    strong = sobel > pixel_threshold
    continuity = strong.mean(axis=1)
    strength = sobel.mean(axis=1)
    score = strength * (1.0 + continuity * 5.0)
    if score.size < 5:
        return None

    kernel = 5 if score.size >= 5 else 3
    if kernel % 2 == 0:
        kernel += 1
    score = cv2.GaussianBlur(score.reshape(-1, 1), (1, kernel), 0).reshape(-1)
    best_index = int(np.argmax(score))
    best_score = float(score[best_index])
    score_floor = max(float(np.percentile(score, 78)) * 1.10, float(np.median(score)) + float(np.std(score)) * 0.95, 5.5)
    continuity_floor = 0.10
    if best_score < score_floor or float(continuity[best_index]) < continuity_floor:
        return None

    edge = y1 + best_index
    min_trim = int(height * 0.012)
    max_trim = int(height * 0.320)
    trim = edge if side == "top" else height - edge
    if trim < min_trim or trim > max_trim:
        return None

    return edge


def _outside_in_edge_from_profile(
    profile: np.ndarray,
    length: int,
    side: str,
    min_trim_ratio: float,
    max_trim_ratio: float,
) -> int | None:
    if profile.size < 20 or length <= 0:
        return None

    kernel = max(7, int(length * 0.015))
    if kernel % 2 == 0:
        kernel += 1
    smoothed = cv2.GaussianBlur(profile.astype(np.float32).reshape(1, -1), (kernel, 1), 0).reshape(-1)

    p65 = float(np.percentile(smoothed, 65))
    p90 = float(np.percentile(smoothed, 90))
    threshold = max(0.020, p65 * 0.48, p90 * 0.24)
    sustain = max(6, int(length * 0.012))
    max_scan = min(profile.size - sustain, int(length * max_trim_ratio))
    min_trim = int(length * min_trim_ratio)

    if side in {"left", "top"}:
        scan_range = range(0, max_scan)
        to_edge = lambda index: index
    else:
        scan_range = range(profile.size - sustain, max(profile.size - max_scan, 0), -1)
        to_edge = lambda index: index + sustain

    for index in scan_range:
        window = smoothed[index : index + sustain]
        if window.size < sustain:
            continue
        if float(window.mean()) < threshold:
            continue
        edge = int(to_edge(index))
        trim = edge if side in {"left", "top"} else length - edge
        if trim < min_trim:
            return 0 if side in {"left", "top"} else length
        return edge

    return None


def _strong_transition_edge_from_outside(
    profile: np.ndarray,
    length: int,
    side: str,
    max_scan_ratio: float,
) -> int | None:
    if profile.size < 20 or length <= 0:
        return None

    kernel = max(5, int(length * 0.010))
    if kernel % 2 == 0:
        kernel += 1
    smoothed = cv2.GaussianBlur(profile.astype(np.float32).reshape(1, -1), (kernel, 1), 0).reshape(-1)
    gradient = np.abs(np.gradient(smoothed))
    edge_score = gradient * (1.0 + smoothed * 0.45)
    threshold = max(
        float(np.percentile(edge_score, 88)) * 0.58,
        float(np.median(edge_score)) + float(np.std(edge_score)) * 0.70,
        0.010,
    )
    max_scan = min(profile.size - 1, int(length * max_scan_ratio))
    min_hold = max(4, int(length * 0.006))

    if side in {"left", "top"}:
        indexes = range(0, max_scan)
        edge_from_index = lambda index: index
    else:
        indexes = range(profile.size - 1, max(profile.size - max_scan, 1), -1)
        edge_from_index = lambda index: index + 1

    for index in indexes:
        start = max(0, index - min_hold // 2)
        end = min(profile.size, index + min_hold // 2 + 1)
        if float(edge_score[start:end].mean()) >= threshold:
            return max(0, min(length, int(edge_from_index(index))))

    return None


def _merge_outer_transition_bounds(
    x1: int,
    y1: int,
    x2: int,
    y2: int,
    column_profile: np.ndarray,
    row_profile: np.ndarray,
    width: int,
    height: int,
) -> tuple[int, int, int, int]:
    left_edge = _strong_transition_edge_from_outside(column_profile, width, "left", 0.220)
    right_edge = _strong_transition_edge_from_outside(column_profile, width, "right", 0.220)
    top_edge = _strong_transition_edge_from_outside(row_profile, height, "top", 0.200)
    bottom_edge = _strong_transition_edge_from_outside(row_profile, height, "bottom", 0.200)

    if left_edge is not None and left_edge <= x1 + width * 0.075:
        x1 = min(x1, left_edge)
    if right_edge is not None and right_edge >= x2 - width * 0.075:
        x2 = max(x2, right_edge)
    if top_edge is not None and top_edge <= y1 + height * 0.065:
        y1 = min(y1, top_edge)
    if bottom_edge is not None and bottom_edge >= y2 - height * 0.065:
        y2 = max(y2, bottom_edge)

    return x1, y1, x2, y2


def _high_contrast_light_card_bounds(
    image: np.ndarray,
    gray: np.ndarray,
    value: np.ndarray,
    saturation: np.ndarray,
    color_distance: np.ndarray,
    background_gray: float,
) -> tuple[int, int, int, int] | None:
    height, width = image.shape[:2]
    if width < 300 or height < 180 or background_gray > 145:
        return None

    center = gray[int(height * 0.18) : int(height * 0.82), int(width * 0.12) : int(width * 0.88)]
    if center.size == 0 or float(np.percentile(center, 70)) < background_gray + 24:
        return None

    light_card = (
        ((gray > background_gray + 26) & (value > 68))
        | ((color_distance > 28) & (value > background_gray + 20) & (saturation > 8))
    ).astype(np.uint8) * 255

    close_w = max(13, int(width * 0.035))
    close_h = max(9, int(height * 0.035))
    if close_w % 2 == 0:
        close_w += 1
    if close_h % 2 == 0:
        close_h += 1
    close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (close_w, close_h))
    light_card = cv2.morphologyEx(light_card, cv2.MORPH_CLOSE, close_kernel, iterations=2)
    light_card = cv2.morphologyEx(
        light_card,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)),
        iterations=1,
    )
    light_card = cv2.dilate(light_card, np.ones((3, 3), np.uint8), iterations=1)

    mask = (light_card > 0).astype(np.float32)
    gray_blur = cv2.GaussianBlur(gray, (3, 3), 0)
    vertical_edges = np.abs(cv2.Sobel(gray_blur, cv2.CV_32F, 1, 0, ksize=3))
    horizontal_edges = np.abs(cv2.Sobel(gray_blur, cv2.CV_32F, 0, 1, ksize=3))
    vertical_edges = vertical_edges / max(1.0, float(np.percentile(vertical_edges, 97)))
    horizontal_edges = horizontal_edges / max(1.0, float(np.percentile(horizontal_edges, 97)))
    vertical_edges = np.clip(vertical_edges, 0, 1)
    horizontal_edges = np.clip(horizontal_edges, 0, 1)

    inner_y1 = int(height * 0.06)
    inner_y2 = max(inner_y1 + 1, int(height * 0.94))
    inner_x1 = int(width * 0.05)
    inner_x2 = max(inner_x1 + 1, int(width * 0.95))
    column_profile = (
        mask[inner_y1:inner_y2, :].mean(axis=0) * 0.82
        + vertical_edges[inner_y1:inner_y2, :].mean(axis=0) * 0.18
    )
    row_profile = (
        mask[:, inner_x1:inner_x2].mean(axis=1) * 0.82
        + horizontal_edges[:, inner_x1:inner_x2].mean(axis=1) * 0.18
    )

    x1 = _outside_in_edge_from_profile(column_profile, width, "left", 0.006, 0.300)
    x2 = _outside_in_edge_from_profile(column_profile, width, "right", 0.006, 0.300)
    y1 = _outside_in_edge_from_profile(row_profile, height, "top", 0.006, 0.260)
    y2 = _outside_in_edge_from_profile(row_profile, height, "bottom", 0.006, 0.260)
    if x1 is None or x2 is None or y1 is None or y2 is None:
        return None

    x1, y1, x2, y2 = _merge_outer_transition_bounds(
        x1,
        y1,
        x2,
        y2,
        column_profile,
        row_profile,
        width,
        height,
    )

    pad_x = max(4, int(width * 0.006))
    pad_y = max(3, int(height * 0.008))
    x1 = max(0, x1 - pad_x)
    y1 = max(0, y1 - pad_y)
    x2 = min(width, x2 + pad_x)
    y2 = min(height, y2 + pad_y)

    if x2 - x1 < width * 0.62 or y2 - y1 < height * 0.62:
        return None

    app.logger.info(
        "High-contrast light DNI bounds applied background_gray=%.1f left=%s right=%s top=%s bottom=%s",
        background_gray,
        x1,
        width - x2,
        y1,
        height - y2,
    )
    return int(x1), int(y1), int(x2), int(y2)


def _outside_in_card_bounds(image: np.ndarray) -> tuple[int, int, int, int] | None:
    height, width = image.shape[:2]
    if width < 300 or height < 180:
        return None

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]

    border = max(4, int(min(width, height) * 0.025))
    border_pixels = np.concatenate(
        [
            image[:border, :, :].reshape(-1, 3),
            image[-border:, :, :].reshape(-1, 3),
            image[:, :border, :].reshape(-1, 3),
            image[:, -border:, :].reshape(-1, 3),
        ],
        axis=0,
    ).astype(np.float32)
    background_bgr = np.median(border_pixels, axis=0)
    color_distance = np.linalg.norm(image.astype(np.float32) - background_bgr.reshape(1, 1, 3), axis=2)
    background_gray = float(np.median(cv2.cvtColor(border_pixels.reshape(-1, 1, 3).astype(np.uint8), cv2.COLOR_BGR2GRAY)))
    background_saturation = float(np.median(cv2.cvtColor(border_pixels.reshape(-1, 1, 3).astype(np.uint8), cv2.COLOR_BGR2HSV)[:, :, 1]))

    high_contrast_bounds = _high_contrast_light_card_bounds(
        image,
        gray,
        value,
        saturation,
        color_distance,
        background_gray,
    )
    if high_contrast_bounds is not None:
        return high_contrast_bounds

    card_mask = (
        (color_distance > 18)
        | (gray < max(210, background_gray - 14))
        | ((saturation > max(18, background_saturation + 8)) & (value < 252))
    ).astype(np.uint8)
    card_mask = cv2.morphologyEx(
        card_mask,
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5)),
        iterations=1,
    )
    card_mask = cv2.dilate(card_mask, np.ones((3, 3), np.uint8), iterations=1)

    gray_blur = cv2.GaussianBlur(gray, (3, 3), 0)
    vertical_edges = np.abs(cv2.Sobel(gray_blur, cv2.CV_32F, 1, 0, ksize=3))
    horizontal_edges = np.abs(cv2.Sobel(gray_blur, cv2.CV_32F, 0, 1, ksize=3))
    vertical_edges = vertical_edges / max(1.0, float(np.percentile(vertical_edges, 97)))
    horizontal_edges = horizontal_edges / max(1.0, float(np.percentile(horizontal_edges, 97)))
    vertical_edges = np.clip(vertical_edges, 0, 1)
    horizontal_edges = np.clip(horizontal_edges, 0, 1)

    inner_y1 = int(height * 0.08)
    inner_y2 = max(inner_y1 + 1, int(height * 0.92))
    inner_x1 = int(width * 0.05)
    inner_x2 = max(inner_x1 + 1, int(width * 0.95))

    column_profile = (
        card_mask[inner_y1:inner_y2, :].mean(axis=0) * 0.72
        + vertical_edges[inner_y1:inner_y2, :].mean(axis=0) * 0.28
    )
    row_profile = (
        card_mask[:, inner_x1:inner_x2].mean(axis=1) * 0.72
        + horizontal_edges[:, inner_x1:inner_x2].mean(axis=1) * 0.28
    )

    x1 = _outside_in_edge_from_profile(column_profile, width, "left", 0.010, 0.360)
    x2 = _outside_in_edge_from_profile(column_profile, width, "right", 0.010, 0.360)
    y1 = _outside_in_edge_from_profile(row_profile, height, "top", 0.008, 0.300)
    y2 = _outside_in_edge_from_profile(row_profile, height, "bottom", 0.008, 0.300)

    if x1 is None or x2 is None or y1 is None or y2 is None:
        return None

    pad_x = max(2, int(width * 0.005))
    pad_y = max(2, int(height * 0.006))
    x1 = max(0, x1 - pad_x)
    x2 = min(width, x2 + pad_x)
    y1 = max(0, y1 - pad_y)
    y2 = min(height, y2 + pad_y)

    if x2 - x1 < width * 0.68 or y2 - y1 < height * 0.68:
        return None

    return int(x1), int(y1), int(x2), int(y2)


def trim_warped_document_margins(image: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    if width < 300 or height < 180:
        return image

    outside_in_bounds = _outside_in_card_bounds(image)
    if outside_in_bounds is not None:
        x1, y1, x2, y2 = outside_in_bounds
        if x1 == 0 and x2 == width and y1 == 0 and y2 == height:
            return image
        cropped = image[y1:y2, x1:x2]
        if cropped.size and cropped.shape[0] >= height * 0.68 and cropped.shape[1] >= width * 0.68:
            app.logger.info(
                "Outside-in DNI margin trim applied left=%s right=%s top=%s bottom=%s original=%sx%s cropped=%sx%s",
                x1,
                width - x2,
                y1,
                height - y2,
                width,
                height,
                cropped.shape[1],
                cropped.shape[0],
            )
            return cropped

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]

    # After perspective correction, paper/background bands are usually bright and
    # low-saturation. Detect the real card using text, border and colored pixels.
    content_mask = (
        (gray < 226)
        | ((saturation > 18) & (value < 248))
        | ((saturation > 34) & (value < 254))
    ).astype(np.uint8)
    content_mask = cv2.morphologyEx(
        content_mask,
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5)),
        iterations=1,
    )
    content_mask = cv2.dilate(content_mask, np.ones((3, 3), np.uint8), iterations=1)

    inner_y1 = int(height * 0.05)
    inner_y2 = max(inner_y1 + 1, int(height * 0.95))
    inner_x1 = int(width * 0.04)
    inner_x2 = max(inner_x1 + 1, int(width * 0.96))
    column_density = content_mask[inner_y1:inner_y2, :].mean(axis=0).astype(np.float32)
    row_density = content_mask[:, inner_x1:inner_x2].mean(axis=1).astype(np.float32)

    x1, x2 = _trim_axis_from_density(column_density, width, "x")
    y1, y2 = _trim_axis_from_density(row_density, height, "y")
    left_edge = _find_vertical_document_edge(gray, "left")
    right_edge = _find_vertical_document_edge(gray, "right")
    top_edge = _find_horizontal_document_edge(gray, "top")
    bottom_edge = _find_horizontal_document_edge(gray, "bottom")
    horizontal_edge_padding = max(4, int(width * 0.014))
    vertical_edge_padding = max(4, int(height * 0.020))
    if left_edge is not None:
        x1 = max(x1, max(0, left_edge - horizontal_edge_padding))
    if right_edge is not None:
        x2 = min(x2, min(width, right_edge + horizontal_edge_padding))
    if top_edge is not None:
        y1 = max(y1, max(0, top_edge - vertical_edge_padding))
    if bottom_edge is not None:
        y2 = min(y2, min(height, bottom_edge + vertical_edge_padding))

    left_trim = x1
    right_trim = width - x2
    top_trim = y1
    bottom_trim = height - y2
    min_horizontal_trim = max(4, int(width * 0.012))
    min_vertical_trim = max(3, int(height * 0.010))
    if left_trim < min_horizontal_trim:
        x1 = 0
    if right_trim < min_horizontal_trim:
        x2 = width
    if top_trim < min_vertical_trim:
        y1 = 0
    if bottom_trim < min_vertical_trim:
        y2 = height

    if x1 == 0 and x2 == width and y1 == 0 and y2 == height:
        return image

    safety_padding_x = max(3, int(width * 0.009))
    safety_padding_y = max(3, int(height * 0.013))
    if x1 > 0:
        x1 = max(0, x1 - safety_padding_x)
    if x2 < width:
        x2 = min(width, x2 + safety_padding_x)
    if y1 > 0:
        y1 = max(0, y1 - safety_padding_y)
    if y2 < height:
        y2 = min(height, y2 + safety_padding_y)

    cropped = image[y1:y2, x1:x2]
    if cropped.size == 0 or cropped.shape[0] < height * 0.68 or cropped.shape[1] < width * 0.68:
        return image

    app.logger.info(
        "Post-warp DNI margin trim applied left=%s right=%s top=%s bottom=%s original=%sx%s cropped=%sx%s",
        x1,
        width - x2,
        y1,
        height - y2,
        width,
        height,
        cropped.shape[1],
        cropped.shape[0],
    )
    return cropped


def warp_document(image: np.ndarray, contour: np.ndarray | None, output_side: Any = None) -> np.ndarray:
    rect = order_points(contour if contour is not None else fallback_document_box(image))
    if contour is not None and env_flag("ENABLE_PRE_WARP_REFINEMENT", True):
        rect = refine_low_quality_side_margins(image, rect)
    if env_flag("ENABLE_PRE_WARP_EXPANSION", True):
        rect = expand_rect_before_warp_for_side(rect, image.shape[1], image.shape[0], output_side)
    else:
        rect = order_points(rect)
    if contour is not None and env_flag("ENABLE_NEAR_FRONTAL_CROP", True) and is_nearly_frontal_rect(rect, output_side):
        conservative = crop_nearly_frontal_document(image, rect)
        if conservative is not None:
            return conservative
    if contour is not None and env_flag("ENABLE_REVERSO_NEAR_FRONTAL_CROP", True) and should_preserve_reverso_near_frontal_crop(rect, image.shape[1], image.shape[0], output_side):
        conservative = crop_nearly_frontal_document(image, rect)
        if conservative is not None:
            return conservative
    width_a = np.linalg.norm(rect[2] - rect[3])
    width_b = np.linalg.norm(rect[1] - rect[0])
    height_a = np.linalg.norm(rect[1] - rect[2])
    height_b = np.linalg.norm(rect[0] - rect[3])

    source_width = max(width_a, width_b)
    source_height = max(height_a, height_b)
    source_is_portrait = source_height > source_width * 1.08

    source_long = max(source_width, source_height)
    source_short = max(1.0, min(source_width, source_height))
    detected_width = int(source_long)
    output_width = int(os.getenv("OUTPUT_WIDTH", str(DEFAULT_OUTPUT_WIDTH)))
    output_width = max(800, min(max(output_width, min(detected_width, DEFAULT_OUTPUT_WIDTH)), 2400))
    normalized_ratio = source_long / source_short
    force_document_ratio = env_flag("FORCE_DOCUMENT_RATIO", True)
    if force_document_ratio and 1.35 <= normalized_ratio <= 1.90:
        output_height = int(round(output_width / DOCUMENT_RATIO))
    else:
        output_height = max(1, int(round(output_width * (source_short / source_long))))
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
    warped = trim_warped_document_margins(warped)
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
    return env_flag("ENABLE_OCR_ORIENTATION", True)


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


def ocr_score_result(
    score: float,
    average_confidence: float,
    readable_tokens: int,
    readable_characters: int,
    keyword_matches: int,
) -> dict[str, Any]:
    return {
        "score": score,
        "averageConfidence": average_confidence,
        "readableTokens": readable_tokens,
        "readableCharacters": readable_characters,
        "keywordMatches": keyword_matches,
    }


def score_tesseract_tokens(text_values: list[Any], confidence_values: list[Any]) -> dict[str, Any]:
    confidence_sum = 0.0
    confidence_weight = 0.0
    readable_tokens = 0
    readable_characters = 0
    garbage_characters = 0
    mrz_evidence = 0
    normalized_tokens: list[str] = []

    for text_value, confidence_value in zip(text_values, confidence_values):
        text = normalize_ocr_text(text_value)
        if not text:
            continue
        try:
            confidence = float(confidence_value)
        except (TypeError, ValueError):
            continue
        if confidence < 0:
            continue

        normalized_tokens.append(text)
        compact = re.sub(r"\s+", "", text)
        alphanumeric = len(re.findall(r"[A-Z0-9]", compact))
        garbage = len(re.findall(r"[^A-Z0-9<]", compact))
        ratio = alphanumeric / max(1, len(compact))
        readable = alphanumeric >= 2 and ratio >= 0.62
        weight = max(1, min(10, alphanumeric))

        if readable:
            readable_tokens += 1
            readable_characters += alphanumeric
            confidence_sum += confidence * weight
            confidence_weight += weight
        garbage_characters += garbage
        if re.search(r"(?:I|P)?<PER[A-Z0-9<]{4,}", compact) or re.search(r"[A-Z0-9<]{18,}", compact):
            mrz_evidence += 1

    joined = f" {' '.join(normalized_tokens)} "
    keyword_matches = sum(1 for keyword in OCR_ORIENTATION_KEYWORDS if keyword in joined)
    average_confidence = confidence_sum / confidence_weight if confidence_weight > 0 else 0.0
    garbage_ratio = garbage_characters / max(1, readable_characters + garbage_characters)

    score = clamp01(
        (average_confidence / 100.0) * 0.38
        + clamp01(readable_tokens / 22.0) * 0.12
        + clamp01(readable_characters / 170.0) * 0.10
        + clamp01(keyword_matches / 6.0) * 0.32
        + clamp01(mrz_evidence / 2.0) * 0.08
        - garbage_ratio * 0.10
    )
    return ocr_score_result(score, average_confidence, readable_tokens, readable_characters, keyword_matches)


def read_ocr_layout_score(image: np.ndarray, page_segmentation_mode: int) -> dict[str, Any] | None:
    try:
        import pytesseract
    except Exception as exc:
        app.logger.warning("OCR skipped because pytesseract is unavailable: %s", exc)
        return None

    prepared = prepare_ocr_image(image)
    try:
        data = pytesseract.image_to_data(
            prepared,
            lang="eng",
            config=f"--psm {page_segmentation_mode}",
            output_type=pytesseract.Output.DICT,
        )
    except Exception as exc:
        app.logger.warning("OCR layout failed: %s", exc)
        return None

    return score_tesseract_tokens(list(data.get("text", [])), list(data.get("conf", [])))


def combine_ocr_scores(block: dict[str, Any] | None, sparse: dict[str, Any] | None) -> dict[str, Any] | None:
    if block is None:
        return sparse
    if sparse is None:
        return block
    return ocr_score_result(
        float(sparse["score"]) * 0.68 + float(block["score"]) * 0.32,
        max(float(block["averageConfidence"]), float(sparse["averageConfidence"])),
        max(int(block["readableTokens"]), int(sparse["readableTokens"])),
        max(int(block["readableCharacters"]), int(sparse["readableCharacters"])),
        max(int(block["keywordMatches"]), int(sparse["keywordMatches"])),
    )


def ocr_orientation_analysis(image: np.ndarray, rotated_180: np.ndarray) -> dict[str, Any] | None:
    sparse_0 = read_ocr_layout_score(image, 11)
    sparse_180 = read_ocr_layout_score(rotated_180, 11)
    block_0 = read_ocr_layout_score(image, 6)
    block_180 = read_ocr_layout_score(rotated_180, 6)
    evidence_0 = combine_ocr_scores(block_0, sparse_0)
    evidence_180 = combine_ocr_scores(block_180, sparse_180)
    if evidence_0 is None or evidence_180 is None:
        return None

    strongest = max(float(evidence_0["score"]), float(evidence_180["score"]))
    best = evidence_0 if float(evidence_0["score"]) >= float(evidence_180["score"]) else evidence_180
    usable = strongest >= 0.16 and (int(best["keywordMatches"]) >= 1 or int(best["readableTokens"]) >= 6)
    if not usable:
        return None

    separation = abs(float(evidence_0["score"]) - float(evidence_180["score"])) / max(0.12, strongest)
    evidence_strength = clamp01((strongest - 0.16) / 0.5)
    confidence = clamp01(0.5 + separation * 0.72 * (0.62 + evidence_strength * 0.38))
    return {
        "rotation": 0 if float(evidence_0["score"]) >= float(evidence_180["score"]) else 180,
        "confidence": max(0.5, min(0.99, confidence)),
        "score0": float(evidence_0["score"]),
        "score180": float(evidence_180["score"]),
        "evidence0": evidence_0,
        "evidence180": evidence_180,
    }


def score_keywords(text: str, keywords: dict[str, int]) -> float:
    score = 0.0
    for keyword, weight in keywords.items():
        if keyword in text:
            score += weight
    return score


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def front_emblem_corner_score(image: np.ndarray, x1: float, x2: float, y1: float, y2: float) -> float:
    height, width = image.shape[:2]
    region = image[int(height * y1): int(height * y2), int(width * x1): int(width * x2)]
    if region.size == 0:
        return 0.0

    hsv = cv2.cvtColor(region, cv2.COLOR_BGR2HSV)
    hue = hsv[:, :, 0]
    saturation = hsv[:, :, 1].astype(np.float32) / 255.0
    value = hsv[:, :, 2].astype(np.float32) / 255.0
    red = ((hue < 10) | (hue > 168)) & (saturation > 0.25) & (value > 0.25)
    green = (hue > 38) & (hue < 95) & (saturation > 0.20) & (value > 0.20)
    yellow = (hue >= 15) & (hue <= 38) & (saturation > 0.25) & (value > 0.25)
    has_emblem_palette = bool(np.any(red) and np.any(green))
    return (
        min(float(red.mean()) * 100.0, 2.0)
        + min(float(green.mean()) * 100.0, 2.0)
        + min(float(yellow.mean()) * 80.0, 1.0)
        + (1.0 if has_emblem_palette else 0.0)
    )


def front_emblem_orientation_analysis(image: np.ndarray) -> dict[str, Any] | None:
    top_left = front_emblem_corner_score(image, 0.00, 0.16, 0.00, 0.20)
    bottom_right = front_emblem_corner_score(image, 0.84, 1.00, 0.80, 1.00)
    delta = top_left - bottom_right
    if abs(delta) < 1.50:
        return None
    return {
        "rotation": 0 if delta > 0 else 180,
        "confidence": min(0.90, 0.62 + min(abs(delta) / 4.0, 1.0) * 0.28),
        "method": "front_emblem_corner",
        "scores": {
            "topLeft": top_left,
            "bottomRight": bottom_right,
        },
    }


def front_portrait_left_score(image: np.ndarray, start_x_ratio: float, end_x_ratio: float) -> float:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape[:2]
    start_y = max(0, int(height * 0.08))
    end_y = min(height, int(height * 0.72))
    start_x = max(0, int(width * start_x_ratio))
    end_x = min(width, int(width * end_x_ratio))
    region = gray[start_y:end_y, start_x:end_x]
    if region.size == 0:
        return 0.0

    region = cv2.GaussianBlur(region, (5, 5), 0)
    mean = float(region.mean())
    deviation = float(region.std()) / 255.0
    gradient_x = cv2.Sobel(region, cv2.CV_32F, 1, 0, ksize=3)
    gradient_y = cv2.Sobel(region, cv2.CV_32F, 0, 1, ksize=3)
    edge_density = float(((np.abs(gradient_x) + np.abs(gradient_y)) > 45).mean())
    dark_density = float((region < mean - 18).mean())
    midtone_density = float(((region > 55) & (region < 205)).mean())
    return dark_density * 0.36 + edge_density * 0.26 + deviation * 0.20 + midtone_density * 0.18


def front_portrait_orientation_analysis(image: np.ndarray) -> dict[str, Any] | None:
    left_score = front_portrait_left_score(image, 0.02, 0.36)
    right_score = front_portrait_left_score(image, 0.64, 0.98)
    delta = left_score - right_score
    if abs(delta) < 0.018:
        return None

    return {
        "rotation": 0 if delta > 0 else 180,
        "confidence": min(0.88, 0.70 + min(abs(delta) / 0.055, 1.0) * 0.18),
        "method": "front_portrait_left",
        "scores": {
            "left": float(left_score),
            "right": float(right_score),
        },
    }


def build_chevron_template(character: str, size: int = 28) -> np.ndarray:
    canvas = np.zeros((size, size), dtype=np.uint8)
    cv2.putText(canvas, character, (2, size - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.9, 255, 2, cv2.LINE_AA)
    return cv2.threshold(canvas, 10, 255, cv2.THRESH_BINARY)[1]


def mrz_chevron_score(image: np.ndarray) -> float:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape[:2]
    region = gray[int(height * 0.02): int(height * 0.98), int(width * 0.02): int(width * 0.98)]
    if region.size == 0:
        return 0.0

    if region.shape[1] < 800:
        scale = 800 / max(1, region.shape[1])
        region = cv2.resize(
            region,
            (int(region.shape[1] * scale), int(region.shape[0] * scale)),
            interpolation=cv2.INTER_CUBIC,
        )

    threshold = cv2.threshold(region, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    less_template = build_chevron_template("<")
    greater_template = build_chevron_template(">")
    less_match = cv2.matchTemplate(threshold, less_template, cv2.TM_CCOEFF_NORMED)
    greater_match = cv2.matchTemplate(threshold, greater_template, cv2.TM_CCOEFF_NORMED)
    less_score = float(less_match[less_match > 0.36].sum()) if np.any(less_match > 0.36) else 0.0
    greater_score = float(greater_match[greater_match > 0.36].sum()) if np.any(greater_match > 0.36) else 0.0
    return less_score - greater_score


def reverse_chevron_orientation_analysis(image: np.ndarray, rotated_180: np.ndarray) -> dict[str, Any] | None:
    score_0 = mrz_chevron_score(image)
    score_180 = mrz_chevron_score(rotated_180)
    delta = abs(score_0 - score_180)
    if max(score_0, score_180) <= 0.0:
        return None
    if delta < 24.0:
        return None
    return {
        "rotation": 0 if score_0 >= score_180 else 180,
        "confidence": min(0.92, 0.62 + min(delta / 220.0, 1.0) * 0.30),
        "method": "reverse_mrz_chevrons",
        "scores": {
            "score0": score_0,
            "score180": score_180,
        },
    }


def reverse_pdf417_region_score(
    gray: np.ndarray,
    start_ratio: float,
    end_ratio: float,
    start_x_ratio: float = 0.06,
    end_x_ratio: float = 0.82,
) -> float:
    height, width = gray.shape[:2]
    start_y = max(0, int(height * start_ratio))
    end_y = min(height, int(height * end_ratio))
    start_x = max(0, int(width * start_x_ratio))
    end_x = min(width, int(width * end_x_ratio))
    region = gray[start_y:end_y, start_x:end_x]
    if region.size == 0:
        return 0.0

    region = cv2.GaussianBlur(region, (3, 3), 0)
    gradient_x = cv2.Sobel(region, cv2.CV_32F, 1, 0, ksize=3)
    gradient_y = cv2.Sobel(region, cv2.CV_32F, 0, 1, ksize=3)
    threshold = cv2.threshold(region, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    dark_mask = threshold > 0
    dark_density = float(dark_mask.mean())
    vertical_density = float((np.abs(gradient_x) > 35).mean())
    edge_density = float(((np.abs(gradient_x) + np.abs(gradient_y)) > 55).mean())
    column_density = dark_mask.mean(axis=0)
    column_variation = float(np.std(column_density))
    column_coverage = float((column_density > 0.08).mean())
    return (
        dark_density * 0.25
        + vertical_density * 0.25
        + edge_density * 0.20
        + column_variation * 0.15
        + column_coverage * 0.15
    )


def reverse_pdf417_orientation_analysis(image: np.ndarray) -> dict[str, Any] | None:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    top_score = reverse_pdf417_region_score(gray, 0.05, 0.38)
    bottom_score = reverse_pdf417_region_score(gray, 0.62, 0.95)
    strongest = max(top_score, bottom_score)
    delta = abs(bottom_score - top_score)
    if strongest < 0.38 or delta < 0.045:
        return None

    confidence = min(
        0.92,
        0.68
        + min(delta / 0.12, 1.0) * 0.22
        + min(max(0.0, strongest - 0.40) / 0.22, 1.0) * 0.02,
    )
    return {
        "rotation": 0 if bottom_score >= top_score else 180,
        "confidence": confidence,
        "method": "reverse_pdf417_bottom_band",
        "scores": {
            "top": float(top_score),
            "bottom": float(bottom_score),
        },
    }


def side_visual_orientation_analysis(image: np.ndarray, rotated_180: np.ndarray, output_side: Any) -> dict[str, Any] | None:
    side = normalize_side(output_side)
    if side == "frente":
        visual_candidates = [
            candidate
            for candidate in (
                front_emblem_orientation_analysis(image),
                front_portrait_orientation_analysis(image),
            )
            if candidate is not None
        ]
        if not visual_candidates:
            return None
        return max(visual_candidates, key=lambda item: float(item["confidence"]))
    if side == "reverso":
        pdf417_orientation = reverse_pdf417_orientation_analysis(image)
        if pdf417_orientation is not None:
            return pdf417_orientation
        return reverse_chevron_orientation_analysis(image, rotated_180)
    return None


def orientation_band_score(
    gray: np.ndarray,
    start_ratio: float,
    end_ratio: float,
    global_mean: float,
) -> float:
    height, width = gray.shape[:2]
    start_x = max(2, round(width * 0.035))
    end_x = min(width - 2, round(width * 0.965))
    start_y = max(2, round(height * start_ratio))
    end_y = min(height - 2, round(height * end_ratio))
    if end_x <= start_x or end_y <= start_y:
        return 0.0

    bin_count = 24
    bin_edges = np.zeros(bin_count, dtype=np.float32)
    bin_samples = np.zeros(bin_count, dtype=np.float32)
    row_energy: list[float] = []
    edge_count = 0.0
    vertical_stroke_count = 0.0
    dark_count = 0.0
    magnitude_sum = 0.0
    samples = 0.0

    gray_i = gray.astype(np.int16)
    for y in range(start_y, end_y, 2):
        current_row_energy = 0.0
        row_samples = 0.0
        for x in range(start_x, end_x, 2):
            gx = abs(int(gray_i[y, min(width - 1, x + 1)]) - int(gray_i[y, max(0, x - 1)]))
            gy = abs(int(gray_i[min(height - 1, y + 1), x]) - int(gray_i[max(0, y - 1), x]))
            is_edge = gx >= 22 or gy >= 28
            bin_index = min(bin_count - 1, int(((x - start_x) / max(1, end_x - start_x)) * bin_count))
            if is_edge:
                edge_count += 1.0
                bin_edges[bin_index] += 1.0
            if gx >= 22:
                vertical_stroke_count += 1.0
            if gray_i[y, x] <= global_mean - 24:
                dark_count += 1.0

            local_magnitude = min(1.0, (gx * 1.15 + gy * 0.35) / 90.0)
            magnitude_sum += local_magnitude
            current_row_energy += local_magnitude
            row_samples += 1.0
            bin_samples[bin_index] += 1.0
            samples += 1.0
        row_energy.append(current_row_energy / max(1.0, row_samples))

    coverage = 0.0
    for index in range(bin_count):
        density = bin_edges[index] / max(1.0, bin_samples[index])
        if density >= 0.045:
            coverage += 1.0
    coverage /= bin_count

    row_energy_sorted = sorted(row_energy, reverse=True)
    peak_count = max(1, round(len(row_energy_sorted) * 0.24))
    peak_energy = sum(row_energy_sorted[:peak_count]) / peak_count if row_energy_sorted else 0.0
    edge_density = edge_count / max(1.0, samples)
    vertical_density = vertical_stroke_count / max(1.0, samples)
    dark_density = dark_count / max(1.0, samples)
    mean_magnitude = magnitude_sum / max(1.0, samples)

    return (
        edge_density * 0.2
        + vertical_density * 0.14
        + mean_magnitude * 0.12
        + peak_energy * 0.12
        + coverage * 0.08
        + dark_density * 0.34
    )


def layout_orientation_analysis(image: np.ndarray) -> dict[str, Any]:
    height, width = image.shape[:2]
    if width < 80 or height < 50:
        return {
            "rotation": 0,
            "confidence": 0.5,
            "topScore": 0.0,
            "bottomScore": 0.0,
        }

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    global_mean = float(gray[::4, ::4].mean()) if gray.size else 0.0
    top_score = orientation_band_score(gray, 0.035, 0.365, global_mean)
    bottom_score = orientation_band_score(gray, 0.635, 0.965, global_mean)
    strongest = max(top_score, bottom_score)
    separation = abs(bottom_score - top_score) / max(0.035, strongest)
    evidence = clamp01((strongest - 0.055) / 0.2)
    confidence = clamp01(0.5 + separation * 0.72 * (0.55 + evidence * 0.45))
    confidence = max(0.5, min(0.99, confidence))
    return {
        "rotation": 0 if bottom_score >= top_score else 180,
        "confidence": confidence,
        "topScore": float(top_score),
        "bottomScore": float(bottom_score),
    }


def auto_orient_document(image: np.ndarray, output_side: Any = None) -> tuple[np.ndarray, dict[str, Any]]:
    layout = layout_orientation_analysis(image)
    ocr_enabled = should_use_ocr_orientation()
    ocr_scores: dict[str, Any] = {"enabled": ocr_enabled}
    side_visual: dict[str, Any] | None = None
    selected_rotation = int(layout["rotation"])
    method = "layout_mrz_barcode"
    confidence = float(layout["confidence"])
    rotated_180: np.ndarray | None = None

    if ocr_enabled:
        rotated_180 = cv2.rotate(image, cv2.ROTATE_180)
        ocr = ocr_orientation_analysis(image, rotated_180)
        if ocr is not None:
            ocr_scores.update(ocr)
            weak_ocr_conflict = (
                float(ocr["confidence"]) < 0.55
                and int(ocr["rotation"]) != selected_rotation
            )
            if not weak_ocr_conflict:
                selected_rotation = int(ocr["rotation"])
                confidence = float(ocr["confidence"])
                method = "ocr_tesseract_layout"

    if rotated_180 is None:
        rotated_180 = cv2.rotate(image, cv2.ROTATE_180)
    side_visual = side_visual_orientation_analysis(image, rotated_180, output_side)
    if side_visual is not None:
        visual_confidence = float(side_visual["confidence"])
        visual_rotation = int(side_visual["rotation"])
        visual_method = str(side_visual["method"])
        if method == "ocr_tesseract_layout":
            should_override = (
                visual_method in {"front_emblem_corner", "reverse_pdf417_bottom_band"}
                and visual_rotation != selected_rotation
                and visual_confidence >= 0.81
                and confidence < 0.98
            )
        else:
            should_override = (
                visual_confidence >= confidence + 0.03
                or (
                    visual_method in {"front_emblem_corner", "front_portrait_left", "reverse_pdf417_bottom_band"}
                    and visual_rotation != selected_rotation
                    and visual_confidence >= 0.81
                )
                or (
                    visual_rotation != selected_rotation
                    and confidence < 0.72
                    and visual_confidence >= 0.68
                )
            )
        if should_override:
            selected_rotation = visual_rotation
            confidence = max(confidence, visual_confidence)
            method = visual_method

    output = cv2.rotate(image, cv2.ROTATE_180) if selected_rotation == 180 else image
    diagnostics = {
        "rotationApplied": selected_rotation,
        "method": method,
        "confidence": confidence,
        "side": normalize_side(output_side),
        "layout": layout,
        "ocr": ocr_scores,
        "sideVisual": side_visual,
    }
    app.logger.info(
        "OpenCV orientation side=%s rotation=%s method=%s confidence=%.2f layout_top=%.4f layout_bottom=%.4f ocr0=%.2f ocr180=%.2f",
        diagnostics["side"],
        selected_rotation,
        method,
        confidence,
        layout.get("topScore", 0.0),
        layout.get("bottomScore", 0.0),
        ocr_scores.get("score0", 0.0),
        ocr_scores.get("score180", 0.0),
    )
    return output, diagnostics


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


def process_selected_image(image: np.ndarray, output_side: Any = None) -> tuple[np.ndarray, dict[str, Any]]:
    contour = find_document_contour(image)
    warped = warp_document(image, contour, output_side)
    oriented, diagnostics = auto_orient_document(warped, output_side)
    return enhance_image(oriented), diagnostics


def process_image(content: bytes, content_type: str, source_path: str | None, side: dict[str, Any]) -> tuple[np.ndarray, dict[str, Any]]:
    area = normalize_area(side.get("selectedArea"))
    image = decode_image(content, content_type, source_path, area)
    selected = preselect_body(image, bool(side.get("hasTwoBodies")), area)
    return process_selected_image(selected, side.get("side"))


def split_two_body_image(image: np.ndarray) -> dict[str, np.ndarray]:
    height = image.shape[0]
    return {
        "superior": image[: int(height * 0.56), :],
        "inferior": image[int(height * 0.44) :, :],
    }


def process_two_body_image(
    image: np.ndarray,
    area_sides: dict[str, str] | None = None,
) -> tuple[dict[str, np.ndarray], str, dict[str, dict[str, Any]]]:
    area_sides = area_sides or {}

    contours = find_document_contours(image, limit=2)
    if len(contours) >= 2:
        ordered = sorted(contours[:2], key=lambda rect: float(rect[:, 1].mean()))
        processed: dict[str, np.ndarray] = {}
        orientation_diagnostics: dict[str, dict[str, Any]] = {}
        for area, contour in (("superior", ordered[0]), ("inferior", ordered[1])):
            warped = warp_document(image, contour, area_sides.get(area))
            oriented, diagnostics = auto_orient_document(warped, area_sides.get(area))
            processed[area] = enhance_image(oriented)
            orientation_diagnostics[area] = diagnostics
        return processed, "contours", orientation_diagnostics

    split_images = split_two_body_image(image)
    processed = {}
    orientation_diagnostics = {}
    for area in ("superior", "inferior"):
        processed[area], orientation_diagnostics[area] = process_selected_image(
            split_images[area],
            area_sides.get(area),
        )
    return processed, "split_fallback", orientation_diagnostics


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


def build_two_body_area_metadata(job: dict[str, Any], reference_side: dict[str, Any]) -> tuple[dict[str, str], dict[str, Any]]:
    fallback_side_areas = area_by_output_side(reference_side)
    side_areas: dict[str, str] = {}
    metadata_entries: list[dict[str, Any]] = []
    sides = job.get("sides") if isinstance(job.get("sides"), list) else []

    for item in sides:
        if not isinstance(item, dict) or not bool(item.get("hasTwoBodies")):
            continue
        side_name = normalize_side(item.get("side"))
        area = normalize_area(item.get("selectedArea"))
        if side_name not in {"frente", "reverso"} or area not in {"superior", "inferior"}:
            continue
        side_areas[side_name] = area
        metadata_entries.append({
            "side": side_name,
            "area": area,
        })

    if len(side_areas) == 1:
        only_side, only_area = next(iter(side_areas.items()))
        side_areas[opposite_side(only_side)] = opposite_area(only_area)

    for side_name, area in fallback_side_areas.items():
        side_areas.setdefault(side_name, area)

    diagnostics = {
        "metadataEntries": metadata_entries,
        "fallbackSideAreas": fallback_side_areas,
        "resolvedSideAreas": side_areas,
        "orientationSource": "opencv_auto_after_crop",
    }
    return side_areas, diagnostics


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
    side_areas, metadata_diagnostics = build_two_body_area_metadata(job, side)
    area_sides = {area: side_name for side_name, area in side_areas.items()}
    processed_by_area, detection_mode, orientation_diagnostics_by_area = process_two_body_image(
        image,
        area_sides,
    )
    assignment_mode = "metadata_side_classification"
    assignment_diagnostics = {
        **metadata_diagnostics,
        "reason": "Gemini metadata is authoritative for side/area only; OpenCV detects contour and corrects orientation after crop.",
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
            tipo_documento=job.get("tipoDocumento"),
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
            "orientationDiagnostics": orientation_diagnostics_by_area.get(area),
            "output": output,
        })

    return outputs


def safe_slug(value: Any, fallback: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9_-]+", "-", clean_text(value)).strip("-")
    return slug or fallback


def document_file_prefix(tipo_documento: Any) -> str:
    text = clean_text(tipo_documento).upper()
    return "ce" if "CE" in text or "EXTRANJ" in text else "dni"


def upload_output(
    image: np.ndarray,
    bucket_name: str | None,
    job_id: str,
    dni: str,
    side_name: str,
    tipo_documento: Any = None,
) -> dict[str, str]:
    init_firebase()
    if bucket_name:
        bucket = storage.bucket(bucket_name)
    else:
        bucket = storage.bucket()

    ok, encoded = cv2.imencode(".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), 94])
    if not ok:
        raise RuntimeError("No se pudo codificar la imagen procesada.")

    prefix = document_file_prefix(tipo_documento)
    safe_document = safe_slug(dni, "documento")
    path = f"{OUTPUT_PREFIX}/{safe_document}/{prefix}-{safe_document}-procesado-{safe_slug(side_name, 'lado')}.jpg"
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
    image, orientation_diagnostics = process_image(content, content_type, source_path, side)
    output = upload_output(
        image=image,
        bucket_name=bucket_name,
        job_id=clean_text(job.get("jobId")) or "job",
        dni=clean_text(job.get("dni")) or "documento",
        side_name=clean_text(side.get("side")) or "lado",
        tipo_documento=job.get("tipoDocumento"),
    )
    return {
        "side": clean_text(side.get("side")) or "lado",
        "sourcePath": source_path,
        "hasTwoBodies": bool(side.get("hasTwoBodies")),
        "selectedArea": normalize_area(side.get("selectedArea")),
        "orientationDiagnostics": orientation_diagnostics,
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
