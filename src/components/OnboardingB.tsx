import "./Onboarding.css";

type OnboardingBProps = {
  onClick?: () => void;
};

export default function OnboardingB({ onClick }: OnboardingBProps) {
  return (
    <div className="onboarding" onClick={onClick}>
      <span className="onboarding-emoji">👋</span>
      <p className="onboarding-text">Wave to start the interaction</p>
    </div>
  );
}
