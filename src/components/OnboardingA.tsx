import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import "./Onboarding.css";

type OnboardingAProps = {
  onClick?: () => void;
};

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WAVE_WINDOW_MS = 1500;
const REQUIRED_DIRECTION_CHANGES = 3;
const MIN_MOVEMENT_PER_FRAME = 0.015;
const MIN_TOTAL_RANGE = 0.18;

export default function OnboardingA({ onClick }: OnboardingAProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const waveDetectedRef = useRef(false);
  const movementHistoryRef = useRef<Array<{ x: number; t: number }>>([]);
  const [status, setStatus] = useState("Initializing camera...");

  useEffect(() => {
    let isMounted = true;

    const detectWave = (now: number, x: number) => {
      const movementHistory = movementHistoryRef.current;
      movementHistory.push({ x, t: now });

      while (movementHistory.length > 0 && now - movementHistory[0].t > WAVE_WINDOW_MS) {
        movementHistory.shift();
      }

      let directionChanges = 0;
      let previousDirection = 0;
      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;

      for (let i = 0; i < movementHistory.length; i += 1) {
        const currentX = movementHistory[i].x;
        if (currentX < minX) minX = currentX;
        if (currentX > maxX) maxX = currentX;

        if (i === 0) continue;

        const delta = currentX - movementHistory[i - 1].x;
        if (Math.abs(delta) < MIN_MOVEMENT_PER_FRAME) continue;

        const direction = delta > 0 ? 1 : -1;
        if (previousDirection !== 0 && direction !== previousDirection) {
          directionChanges += 1;
        }
        previousDirection = direction;
      }

      const totalRange = maxX - minX;
      return directionChanges >= REQUIRED_DIRECTION_CHANGES && totalRange >= MIN_TOTAL_RANGE;
    };

    const processFrame = () => {
      if (!isMounted) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const handLandmarker = handLandmarkerRef.current;
      if (!video || !canvas || !handLandmarker || waveDetectedRef.current) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      if (video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;

        const results = handLandmarker.detectForVideo(video, performance.now());
        const firstHand = results.landmarks?.[0];
        const ctx = canvas.getContext("2d");

        if (ctx) {
          if (
            video.videoWidth > 0 &&
            video.videoHeight > 0 &&
            (canvas.width !== video.videoWidth ||
              canvas.height !== video.videoHeight)
          ) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const connections = HandLandmarker.HAND_CONNECTIONS;

          for (const landmarks of results.landmarks ?? []) {
            ctx.strokeStyle = "#3CD352";
            ctx.lineWidth = 2;
            ctx.beginPath();

            for (const connection of connections) {
              const start = landmarks[connection.start];
              const end = landmarks[connection.end];
              if (!start || !end) continue;

              ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
              ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
            }
            ctx.stroke();

            ctx.fillStyle = "#FFFFFF";
            for (const landmark of landmarks) {
              ctx.beginPath();
              ctx.arc(
                landmark.x * canvas.width,
                landmark.y * canvas.height,
                3,
                0,
                Math.PI * 2
              );
              ctx.fill();
            }
          }
        }

        if (firstHand) {
          setStatus("Hand detected. Wave to continue.");
          const wristX = firstHand[0].x;
          const waved = detectWave(Date.now(), wristX);

          if (waved && !waveDetectedRef.current) {
            waveDetectedRef.current = true;
            setStatus("Wave detected. Starting...");
            onClick?.();
          }
        } else {
          setStatus("Show one hand to the camera.");
          movementHistoryRef.current = [];
        }
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    const initialize = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        if (!isMounted) {
          handLandmarker.close();
          return;
        }
        handLandmarkerRef.current = handLandmarker;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: "user",
          },
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setStatus("Camera ready. Wave to continue.");
        }

        processFrame();
      } catch (error) {
        console.error("Wave detector setup failed:", error);
        setStatus("Camera unavailable.");
      }
    };

    initialize();

    return () => {
      isMounted = false;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, [onClick]);

  return (
    <div className="onboarding">
      <span className="onboarding-emoji">👋</span>
      <p className="onboarding-text">Wave to start</p>
      <p className="onboarding-status">{status}</p>

      <div className="camera-debug">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="camera-debug-video"
        />
        <canvas ref={canvasRef} className="camera-debug-canvas" />
      </div>
    </div>
  );
}
