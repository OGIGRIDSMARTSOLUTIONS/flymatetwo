import type { VerificationState } from "../../shared/operations";

export const verificationLabels: Record<VerificationState, string> = {
  draft: "Not submitted",
  pending: "Awaiting review",
  needs_resubmission: "New upload requested",
  approved: "Approved",
  rejected: "Rejected",
};

export const verificationBadge: Record<VerificationState, string> = {
  draft: "neutral",
  pending: "amber",
  needs_resubmission: "amber",
  approved: "success",
  rejected: "neutral",
};
