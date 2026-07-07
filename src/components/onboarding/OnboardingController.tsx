import React, { useState, useEffect } from 'react';
  import { ChevronLeft, ChevronRight } from 'lucide-react';

import { saveOnboardingStep, completeOnboarding, getOnboardingData } from '../../services/onboardingService';

export interface OnboardingStep {
    id: string;
  title: string;
  description: string;
  component: React.ComponentType<OnboardingStepProps>;
}

export interface OnboardingStepProps {
    onNext: (data?: Record<string, any>) => void;
  onPrev: () => void;
  stepData?: Record<string, any>;
}

export interface OnboardingControllerProps {
    steps: OnboardingStep[];
  userId: string;
  onComplete: () => void;
  onCancel?: () => void;
}

export const OnboardingController: React.FC<OnboardingControllerProps> = ({
  steps,
  userId,
  onComplete,
  onCancel,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState<Record<string, Record<string, any>>>({});
  const [isLoading, setIsLoading] = useState(false);

const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  useEffect(() => {
    const existingData = getOnboardingData(userId);
    if (existingData) {
      const loadedStepData: Record<string, Record<string, any>> = {};
      existingData.steps.forEach((step) => {
                if (step.data) {
                  loadedStepData[step.id] = step.data;
        }
        });
      setStepData(loadedStepData);
  }
}, [userId]);

const handleNext = async (data?: Record<string, any>) => {
    try {
      setIsLoading(true);
      const stepDataToSave = data || {};
      setStepData((prev) => ({
        ...prev,
        [currentStep.id]: stepDataToSave,
}));

      await saveOnboardingStep(userId, currentStep.id, stepDataToSave);

      if (isLastStep) {
        await completeOnboarding(userId);
        onComplete();
} else {
        setCurrentStepIndex((prev) => prev + 1);
}
} catch (error) {
      console.error('Error saving onboarding step:', error);
} finally {
      setIsLoading(false);
}
};

const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
}
};

  const StepComponent = currentStep.component;
  const currentStepData = stepData[currentStep.id];

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold text-gray-900">{currentStep.title}</h2>
          <span className="text-sm text-gray-500">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
}}
          />
        </div>
      </div>

      <p className="text-gray-600 mb-6">{currentStep.description}</p>

      <div className="mb-8 min-h-[300px]">
        <StepComponent
          onNext={handleNext}
          onPrev={handlePrev}
          stepData={currentStepData}
        />
      </div>

      <div className="flex justify-between items-center gap-4">
        <button
          onClick={handlePrev}
          disabled={isFirstStep || isLoading}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={20} />
          <span>Previous</span>
        </button>

        <div className="flex gap-2">
{onCancel && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => handleNext()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span>{isLastStep ? 'Complete' : 'Next'}</span>
{!isLastStep && <ChevronRight size={20} />}
          </button>
        </div>
      </div>
      <div className="flex justify-center gap-2 mt-8">
{steps.map((step, index) => (
          <div
            key={step.id}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentStepIndex
                ? 'w-8 bg-emerald-500'
                : index < currentStepIndex
                ? 'w-2 bg-emerald-300'
                : 'w-2 bg-gray-300'
}`}
          />
        ))}
      </div>
    </div>
  );
};

export default OnboardingController;
