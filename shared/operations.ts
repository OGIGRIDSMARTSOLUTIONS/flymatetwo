export type StaffSession = {
  token: string;
  staff: { name: string; email: string };
};
export type ShipmentStage =
  "Published" | "Matched" | "Picked up" | "In transit" | "Delivered";

export type OperationShipment = {
  id: string;
  title: string;
  origin: string;
  destination: string;
  sender: string;
  traveler: string | null;
  status: ShipmentStage;
  preferredDate: string | null;
  timeline: { status: ShipmentStage; at: string }[];
  handoffLocked: boolean;
  testPayment: "unpaid" | "pending" | "confirmed" | "eligible" | null;
};

export type VerificationQueueItem = {
  id: string;
  name: string;
  email: string;
  uploaded: number;
  state: VerificationState;
  submittedAt: string | null;
};

export type OperationsSnapshot = {
  observedAt: string;
  shipments: OperationShipment[];
  verification: VerificationQueueItem[];
  totals: { active: number; delivered: number; pendingVerification: number };
  documentUploadsEnabled: boolean;
};

export type VerificationState =
  "draft" | "pending" | "needs_resubmission" | "approved" | "rejected";
export type VerificationDecision = Exclude<
  VerificationState,
  "draft" | "pending"
>;
export type VerificationCase = {
  id: string;
  name: string;
  email: string;
  state: VerificationState;
  revision: number;
  submittedAt: string;
  documents: { slot: "front" | "back" | "selfie"; url: string }[];
  history: {
    decision: VerificationDecision;
    reviewer: string;
    reason: string | null;
    at: string;
    revision: number;
  }[];
};
