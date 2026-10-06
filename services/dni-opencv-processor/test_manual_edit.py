import base64
import os
import unittest
from unittest.mock import patch

import cv2
import numpy as np

import app as processor


class ManualEditTests(unittest.TestCase):
    def setUp(self):
        self.image = np.zeros((800, 1400, 3), dtype=np.uint8)
        self.image[100:700, 100:1300] = (230, 230, 230)

    def test_manual_selection_always_has_dni_ratio(self):
        selections = [
            [(100, 100), (700, 100), (700, 650), (100, 650)],
            [(100, 100), (1200, 100), (1200, 550), (100, 550)],
            [(200, 100), (1050, 180), (1200, 600), (100, 650)],
        ]
        with patch.dict(os.environ, {"OUTPUT_WIDTH": "1015", "FORCE_DOCUMENT_RATIO": "false"}):
            for corners in selections:
                with self.subTest(corners=corners):
                    points = [{"x": x / 1400, "y": y / 800} for x, y in corners]
                    output = processor.apply_manual_perspective(self.image, points)
                    self.assertEqual(output.shape[:2], (637, 1015))

    def test_selected_corners_remain_output_corners_without_rotation_or_trim(self):
        corners = [(200, 150), (1100, 150), (1100, 650), (200, 650)]
        colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0)]
        for corner, color in zip(corners, colors):
            cv2.circle(self.image, corner, 30, color, -1)
        # The editor may receive either camera orientation, but the user rotates
        # it back to normal before sending the image and marking its corners.
        for camera_turn in (-1, 1):
            with self.subTest(camera_turn=camera_turn), \
                    patch.dict(os.environ, {"OUTPUT_WIDTH": "1015"}), \
                    patch.object(processor.cv2, "rotate", side_effect=AssertionError("Unexpected rotation")), \
                    patch.object(processor, "trim_warped_document_margins", side_effect=AssertionError("Unexpected second crop")):
                camera_image = np.rot90(self.image, camera_turn)
                upright_image = np.ascontiguousarray(np.rot90(camera_image, -camera_turn))
                output = processor.apply_manual_perspective(
                    upright_image, [{"x": x, "y": y} for x, y in corners],
                )
                actual_corners = [output[0, 0], output[0, -1], output[-1, -1], output[-1, 0]]
                for actual, expected in zip(actual_corners, colors):
                    np.testing.assert_array_equal(actual, expected)

    def test_no_points_preserves_image_geometry(self):
        self.assertIs(processor.apply_manual_perspective(self.image, None), self.image)

    def test_manual_endpoint_saves_single_crop_for_both_sides(self):
        ok, encoded = cv2.imencode(".png", self.image)
        self.assertTrue(ok)
        data_url = "data:image/png;base64," + base64.b64encode(encoded).decode("ascii")
        points = [{"x": x, "y": y} for x, y in [(100, 100), (1200, 100), (1200, 550), (100, 550)]]
        for side in ("frente", "reverso"):
            with self.subTest(side=side), \
                    patch.dict(os.environ, {"OUTPUT_WIDTH": "1015"}), \
                    patch.object(processor, "require_authorization", return_value=(True, None)), \
                    patch.object(processor.cv2, "rotate", side_effect=AssertionError("Unexpected rotation")), \
                    patch.object(processor, "trim_warped_document_margins", side_effect=AssertionError("Unexpected second crop")), \
                    patch.object(processor, "upload_manual_output", return_value={"url": "test-only"}) as upload:
                response = processor.app.test_client().post("/manual-edit", json={
                    "imageDataUrl": data_url,
                    "perspectivePoints": points,
                    "side": side,
                    "outputPath": "test.jpg",
                    "smallPath": "test-small.jpg",
                })
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.get_json()["status"], "completed")
                self.assertEqual(upload.call_args.kwargs["image"].shape[:2], (637, 1015))


if __name__ == "__main__":
    unittest.main()
