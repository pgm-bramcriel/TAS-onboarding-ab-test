import { useState } from "react";
import MediapipeWaveDetector from "./MediapipeWaveDetector";
import "./Onboarding.css";

type OnboardingAProps = {
  onClick?: () => void;
};

export default function OnboardingA({ onClick }: OnboardingAProps) {
  const [status, setStatus] = useState("Initializing camera...");

  return (
    <div className="onboarding">
      <span className="onboarding-emoji">👋</span>
      <p className="onboarding-text">Wave to start</p>
      <p className="onboarding-status">{status}</p>
      <MediapipeWaveDetector
        onWaveDetected={onClick}
        onStatusChange={setStatus}
      />
    </div>
  );
}
