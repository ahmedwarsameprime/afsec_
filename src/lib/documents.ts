// The official SOC-AFSEC file inspection checklist.
// Order here = order shown in the CRM and on the public profile.
// `expiry: true` means the document typically carries an expiry date
// (we still always allow an issue + expiry date for any of them).

export type DocSpec = {
  key: string;
  label: string;
  expiry: boolean;
};

export const FILE_CHECKLIST: DocSpec[] = [
  { key: "ack_training", label: "Acknowledgment of Training", expiry: false },
  { key: "arming_approval", label: "Arming Approval Letter", expiry: true },
  { key: "mil_police_cert", label: "Military / Police Training / Security Certification", expiry: true },
  { key: "interpol_clearance", label: "Interpol / Police Clearance", expiry: true },
  { key: "passport_copy", label: "Copy of Passport", expiry: true },
  { key: "loa_copy", label: "Copy of LOA", expiry: true },
  { key: "use_of_force", label: "Rules of Use of Force Form", expiry: false },
  { key: "rifle_scorecard", label: "Rifle Qualification Scorecard", expiry: true },
  { key: "dd2760", label: "DD Form 2760 — Qualification to Possess Firearms or Ammunition", expiry: false },
  { key: "tip_cert", label: "TIP Training Certificate", expiry: true },
  { key: "medical_clearance", label: "Medical Clearance Form", expiry: true },
];

export const CHECKLIST_KEYS = new Set(FILE_CHECKLIST.map((d) => d.key));

export function docLabel(key: string): string {
  return FILE_CHECKLIST.find((d) => d.key === key)?.label ?? key;
}
