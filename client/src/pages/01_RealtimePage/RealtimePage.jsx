import { useEffect, useRef, useState } from "react";
import { useLang } from "../../context/LangContext";
import "./RealtimePage.css";

export default function DetectPage() {
  const { lang } = useLang();

  const AI_URL = process.env.REACT_APP_AI_URL;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [streaming, setStreaming] = useState(false);
  const [detections, setDetections] = useState([]);
  const [error, setError] = useState("");
  const [savedImages, setSavedImages] = useState([]);

  // open camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      videoRef.current.srcObject = stream;
      setStreaming(true);
      setError("");
    } catch {
      setError(
        lang === "th"
          ? "กรุณาอนุญาตการเข้าถึงกล้อง"
          : "Please allow camera access"
      );
    }
  };

  // close camera
  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStreaming(false);
  };

  // send frame to YOLO and get detections
  const sendFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg");
    });

    const formData = new FormData();
    formData.append("file", blob, "frame.jpg");

    try {
      const res = await fetch(`${AI_URL}/detect`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        setError(
          lang === "th"
            ? "เชื่อมต่อ YOLO server ไม่ได้"
            : "Cannot connect to YOLO server"
        );
        return;
      }

      const data = await res.json();

      if (!data.detections) {
        setError(
          lang === "th"
            ? "รูปแบบข้อมูลไม่ถูกต้อง"
            : "Invalid detection format"
        );
        return;
      }

      setDetections(data.detections);
    } catch (err) {
      setError(
        lang === "th"
          ? "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์"
          : "Server error"
      );
    }
  };

  // AI Loop
  useEffect(() => {
    let interval = null;
    if (streaming) {
      interval = setInterval(sendFrame, 400);
    } else {
      setDetections([]);
    }
    return () => clearInterval(interval);
  }, [streaming]);

  // capture image
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const imageURL = canvas.toDataURL("image/jpeg");

    const saveObj = {
      id: Date.now(),
      image: imageURL,
      detections: [...detections],
      time: new Date().toLocaleString(lang === "th" ? "th-TH" : "en-US"),
    };

    setSavedImages((prev) => [saveObj, ...prev]);
  };

  const removeAll = () => {
    setSavedImages([]);
  };

  return (
    <div className="detect-wrapper">
      <h2>
        {lang === "th" ? "ตรวจจับวัตถุแบบเรียลไทม์" : "Real-time object detection"}
      </h2>

      {error && <p className="error-box">{error}</p>}

      {/* Video + Canvas */}
      <div className="camera-zone">
        <video ref={videoRef} autoPlay playsInline className="video-feed" />
        <canvas ref={canvasRef} className="hidden-canvas"></canvas>
      </div>

      {/* Buttons */}
      <div className="btn-row">
        {!streaming ? (
          <button onClick={startCamera} className="btn start">
            {lang === "th" ? "เปิดกล้อง" : "Open camera"}
          </button>
        ) : (
          <button onClick={stopCamera} className="btn stop">
            {lang === "th" ? "ปิดกล้อง" : "Close camera"}
          </button>
        )}

        <button
          onClick={captureImage}
          disabled={!streaming}
          className="btn capture"
        >
          {lang === "th" ? "ถ่ายภาพ" : "Capture"}
        </button>
      </div>

      {/* Detection list */}
      <div className="detect-list">
        <h3>
          {lang === "th" ? "ผลการตรวจจับ" : "Detected objects"} (
          {detections.length})
        </h3>

        {detections.length === 0 ? (
          <p className="empty">
            {lang === "th" ? "ยังไม่พบวัตถุ" : "No objects detected"}
          </p>
        ) : (
          <ul>
            {detections.map((d, i) => (
              <li key={i}>
                {d.class} ({Math.round(d.conf * 100)}%)
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Saved images */}
      <div className="saved-box">
        <h3>
          {lang === "th" ? "ภาพที่บันทึก" : "Saved images"} ({savedImages.length})
        </h3>

        {savedImages.length > 0 && (
          <button onClick={removeAll} className="btn danger">
            {lang === "th" ? "ลบทั้งหมด" : "Clear all"}
          </button>
        )}

        <div className="saved-grid">
          {savedImages.map((img) => (
            <div className="saved-item" key={img.id}>
              <img src={img.image} alt="" />
              <div className="saved-meta">
                <p>
                  {lang === "th" ? "วัตถุ" : "Objects"}:{" "}
                  {img.detections.length}
                </p>
                <p>{img.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}