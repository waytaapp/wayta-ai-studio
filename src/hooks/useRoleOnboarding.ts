import { UserRole } from '../types';

const roleSteps: Record<string, string[]> = {
  patron: ['welcome', 'discovery', 'ordering', 'security'],
  bartender: ['welcome', 'orders', 'efficiency'],
  manager: ['welcome', 'analytics', 'operations'],
};

export function useRoleOnboarding(role: string) {
  const steps = roleSteps[role] ?? roleSteps['patron'];
  return { steps, length: steps.length };
}
