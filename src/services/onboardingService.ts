import { User } from '../types';

export interface OnboardingStep {
  id: string;
    name: string;
      completed: boolean;
        data?: Record<string, any>;
        }

        export interface OnboardingData {
          userId: string;
            steps: OnboardingStep[];
              currentStep: number;
                completedAt?: Date;
                }

                const STORAGE_KEY = 'wayta_onboarding_data';

                /**
                 * Save a single onboarding step's progress
                  */
                  export const saveOnboardingStep = async (
                    userId: string,
                      stepId: string,
                        stepData: Record<string, any>
                        ): Promise<void> => {
                          try {
                              const data = getOnboardingData(userId) || {
                                    userId,
                                          steps: [],
                                                currentStep: 0,
                                                    };

                                                        const stepIndex = data.steps.findIndex(s => s.id === stepId);
                                                            if (stepIndex >= 0) {
                                                                  data.steps[stepIndex] = {
                                                                          ...data.steps[stepIndex],
                                                                                  completed: true,
                                                                                          data: { ...data.steps[stepIndex].data, ...stepData },
                                                                                                };
                                                                                                    } else {
                                                                                                          data.steps.push({
                                                                                                                  id: stepId,
                                                                                                                          name: stepId,
                                                                                                                                  completed: true,
                                                                                                                                          data: stepData,
                                                                                                                                                });
                                                                                                                                                    }
                                                                                                                                                    
                                                                                                                                                        localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(data));
                                                                                                                                                            console.log(`Onboarding step ${stepId} saved for user ${userId}`);
                                                                                                                                                              } catch (error) {
                                                                                                                                                                  console.error('Failed to save onboarding step:', error);
                                                                                                                                                                      throw error;
                                                                                                                                                                        }
                                                                                                                                                                        };
                                                                                                                                                                        
                                                                                                                                                                        /**
                                                                                                                                                                         * Mark onboarding as complete
                                                                                                                                                                          */
                                                                                                                                                                          export const completeOnboarding = async (
                                                                                                                                                                            userId: string
                                                                                                                                                                            ): Promise<void> => {
                                                                                                                                                                              try {
                                                                                                                                                                                  const data = getOnboardingData(userId);
                                                                                                                                                                                      if (data) {
                                                                                                                                                                                            data.completedAt = new Date();
                                                                                                                                                                                                  localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(data));
                                                                                                                                                                                                        console.log(`Onboarding completed for user ${userId}`);
                                                                                                                                                                                                            }
                                                                                                                                                                                                              } catch (error) {
                                                                                                                                                                                                                  console.error('Failed to complete onboarding:', error);
                                                                                                                                                                                                                      throw error;
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                        };
                                                                                                                                                                                                                        
                                                                                                                                                                                                                        /**
                                                                                                                                                                                                                         * Get all onboarding data for a user
                                                                                                                                                                                                                          */
                                                                                                                                                                                                                          export const getOnboardingData = (userId: string): OnboardingData | null => {
                                                                                                                                                                                                                            try {
                                                                                                                                                                                                                                const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
                                                                                                                                                                                                                                    return stored ? JSON.parse(stored) : null;
                                                                                                                                                                                                                                      } catch (error) {
                                                                                                                                                                                                                                          console.error('Failed to get onboarding data:', error);
                                                                                                                                                                                                                                              return null;
                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                };
                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                /**
                                                                                                                                                                                                                                                 * Get a specific step's data
                                                                                                                                                                                                                                                  */
                                                                                                                                                                                                                                                  export const getStepData = (
                                                                                                                                                                                                                                                    userId: string,
                                                                                                                                                                                                                                                      stepId: string
                                                                                                                                                                                                                                                      ): Record<string, any> | null => {
                                                                                                                                                                                                                                                        const data = getOnboardingData(userId);
                                                                                                                                                                                                                                                          if (!data) return null;
                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                            const step = data.steps.find(s => s.id === stepId);
                                                                                                                                                                                                                                                              return step?.data || null;
                                                                                                                                                                                                                                                              };
                                                                                                                                                                                                                                                              
                                                                                                                                                                                                                                                              /**
                                                                                                                                                                                                                                                               * Check if onboarding is completed
                                                                                                                                                                                                                                                                */
                                                                                                                                                                                                                                                                export const isOnboardingCompleted = (userId: string): boolean => {
                                                                                                                                                                                                                                                                  const data = getOnboardingData(userId);
                                                                                                                                                                                                                                                                    return data?.completedAt !== undefined;
                                                                                                                                                                                                                                                                    };
                                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                    /**
                                                                                                                                                                                                                                                                     * Reset onboarding data for a user
                                                                                                                                                                                                                                                                      */
                                                                                                                                                                                                                                                                      export const resetOnboarding = (userId: string): void => {
                                                                                                                                                                                                                                                                        try {
                                                                                                                                                                                                                                                                            localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
                                                                                                                                                                                                                                                                                console.log(`Onboarding data reset for user ${userId}`);
                                                                                                                                                                                                                                                                                  } catch (error) {
                                                                                                                                                                                                                                                                                      console.error('Failed to reset onboarding:', error);
                                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                                        };
