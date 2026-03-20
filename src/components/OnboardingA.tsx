import "./Onboarding.css";

type OnboardingAProps = {
  onClick?: () => void;
};

export default function OnboardingA({ onClick }: OnboardingAProps) {
  return (
    <div className="onboarding" onClick={onClick}>
      <span className="onboarding-emoji">👋</span>
      <p className="onboarding-text">Wave to start</p>
    </div>
  );
}
