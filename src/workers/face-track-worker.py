#!/usr/bin/env python3
"""
Face Tracking Worker for AI-Publisher
Uses OpenCV to detect faces in video frames and outputs per-frame crop coordinates.
"""

import cv2
import json
import sys
import numpy as np
from typing import Optional, List, Dict, Any


class FaceTracker:
    def __init__(self, video_path: str, sample_interval: float = 0.5,
                 scale_factor: float = 0.5, min_face_size: int = 30):
        """
        Initialize face tracker.

        Args:
            video_path: Path to input video
            sample_interval: Seconds between frames to analyze
            scale_factor: Scale factor for faster processing (0.5 = half size)
            min_face_size: Minimum face size in pixels to consider
        """
        self.video_path = video_path
        self.sample_interval = sample_interval
        self.scale_factor = scale_factor
        self.min_face_size = min_face_size

        # Initialize face detector (Haar Cascade - fast and reliable)
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )

        # Also load profile face detector for side views
        self.profile_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_profileface.xml'
        )

        # Try to load DNN face detector (more accurate but slower)
        self.dnn_detector = None
        self._try_load_dnn_detector()

    def _try_load_dnn_detector(self):
        """Attempt to load DNN-based face detector."""
        try:
            # OpenCV DNN face detector model files
            # Using a pre-trained model from OpenCV's extra data
            prototxt = "deploy.prototxt"
            caffemodel = "face_detection.caffemodel"
            # This is optional - Haar cascade is the fallback
        except Exception:
            pass

    def detect_face_in_frame(self, frame: np.ndarray) -> Optional[Dict[str, Any]]:
        """
        Detect the largest face in a single frame.

        Returns:
            Dict with face center (x, y), width, height, and confidence
            or None if no face found
        """
        # Convert to grayscale for detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Scale down for faster processing
        small_gray = cv2.resize(gray, None, fx=self.scale_factor, fy=self.scale_factor)

        # Normalize
        small_gray = cv2.equalizeHist(small_gray)

        # Detect faces with Haar cascade
        faces = self.face_cascade.detectMultiScale(
            small_gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(max(1, int(self.min_face_size * self.scale_factor)),) * 2,
            flags=cv2.CASCADE_SCALE_IMAGE
        )

        # If no frontal face found, try profile cascade
        if len(faces) == 0:
            faces = self.profile_cascade.detectMultiScale(
                small_gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(max(1, int(self.min_face_size * self.scale_factor)),) * 2,
                flags=cv2.CASCADE_SCALE_IMAGE
            )

        if len(faces) == 0:
            return None

        # Find the largest face
        largest_face = max(faces, key=lambda f: f[2] * f[3])

        x, y, w, h = largest_face

        # Scale back to original coordinates
        scale = 1.0 / self.scale_factor
        cx = int((x + w / 2) * scale)
        cy = int((y + h / 2) * scale)
        fw = int(w * scale)
        fh = int(h * scale)

        # Calculate confidence based on face size relative to frame
        frame_area = frame.shape[0] * frame.shape[1]
        face_area = fw * fh
        confidence = min(1.0, face_area / (frame_area * 0.01))  # 1% of frame = confidence 1.0

        return {
            'x': cx,
            'y': cy,
            'width': fw,
            'height': fh,
            'confidence': float(confidence)
        }

    def process_video(self, start_time: float = 0, duration: Optional[float] = None) -> Dict[str, Any]:
        """
        Process video and return face tracking data.

        Args:
            start_time: Start position in seconds
            duration: Duration to process in seconds (None = entire video)

        Returns:
            Dict with frames data, duration, and mode
        """
        cap = cv2.VideoCapture(self.video_path)

        if not cap.isOpened():
            return {
                'error': f'Failed to open video: {self.video_path}',
                'frames': [],
                'duration': 0,
                'mode': 'face'
            }

        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        video_duration = total_frames / fps if fps > 0 else 0

        if duration is not None:
            video_duration = min(duration, video_duration)

        frames_data = []
        current_time = start_time
        frame_interval = self.sample_interval

        # Seek to start time
        cap.set(cv2.CAP_PROP_POS_MSEC, start_time * 1000)

        next_sample_time = start_time
        frame_count = 0

        while current_time <= start_time + video_duration:
            ret, frame = cap.read()

            if not ret:
                break

            # Check if we should process this frame
            if current_time >= next_sample_time:
                face_data = self.detect_face_in_frame(frame)

                if face_data:
                    frames_data.append({
                        'timestamp': round(current_time, 3),
                        'cropX': face_data['x'],
                        'cropY': face_data['y'],
                        'cropW': face_data['width'],
                        'cropH': face_data['height'],
                        'confidence': face_data['confidence']
                    })
                else:
                    # No face detected - use center
                    frames_data.append({
                        'timestamp': round(current_time, 3),
                        'cropX': width // 2,
                        'cropY': height // 2,
                        'cropW': 0,
                        'cropH': 0,
                        'confidence': 0.0
                    })

                next_sample_time = current_time + frame_interval

            current_time = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
            frame_count += 1

        cap.release()

        return {
            'frames': frames_data,
            'duration': video_duration,
            'mode': 'face',
            'videoWidth': width,
            'videoHeight': height,
            'fps': fps
        }


def main():
    """Main entry point for face tracking worker."""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: face-track-worker.py <video_path> [start_time] [duration]'}))
        sys.exit(1)

    video_path = sys.argv[1]
    start_time = float(sys.argv[2]) if len(sys.argv) > 2 else 0
    duration = float(sys.argv[3]) if len(sys.argv) > 3 else None

    try:
        tracker = FaceTracker(video_path)
        result = tracker.process_video(start_time, duration)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'frames': [],
            'duration': 0,
            'mode': 'face'
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()
