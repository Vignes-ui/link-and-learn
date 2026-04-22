export const ROLES = [
  { value: 'student', label: 'Student', type: 'personal' },
  { value: 'researcher', label: 'Researcher / Faculty', type: 'personal' },
  { value: 'institution', label: 'School / College / University', type: 'institutional' },
  { value: 'govt_body', label: 'Government Research Body', type: 'institutional' },
  { value: 'ngo', label: 'NGO / Funding Agency', type: 'institutional' },
  { value: 'vendor', label: 'Vendor / Supplier', type: 'institutional' },
  { value: 'advertiser', label: 'Advertiser / Sponsor', type: 'institutional' },
];

export const roleByValue = (value) => ROLES.find((role) => role.value === value);

export const isInstitutionalRole = (value) => roleByValue(value)?.type === 'institutional';
