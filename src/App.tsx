import { useState } from "react";
import OnboardingA from "./components/OnboardingA";

function App() {
  const [hasClickedOnboarding, setHasClickedOnboarding] = useState(false);

  if (hasClickedOnboarding) {
    return (
      <div className="onboarding">
        <p className="onboarding-text">Thanks for testing our interaction!</p>
      </div>
    );
  }

  return (
    <>
      <OnboardingA onClick={() => setHasClickedOnboarding(true)} />
    </>
  );
}

export default App;
