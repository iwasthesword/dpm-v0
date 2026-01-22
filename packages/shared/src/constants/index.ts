// User Roles with labels
export const USER_ROLES = {
  ADMIN: { value: 'ADMIN', label: 'Administrator' },
  DENTIST: { value: 'DENTIST', label: 'Dentist' },
  RECEPTIONIST: { value: 'RECEPTIONIST', label: 'Receptionist' },
  ASSISTANT: { value: 'ASSISTANT', label: 'Dental Assistant' },
  FINANCIAL: { value: 'FINANCIAL', label: 'Financial' },
} as const;

// Appointment Types with labels
export const APPOINTMENT_TYPES = {
  EVALUATION: { value: 'EVALUATION', label: 'Evaluation', color: '#3B82F6' },
  TREATMENT: { value: 'TREATMENT', label: 'Treatment', color: '#10B981' },
  RETURN: { value: 'RETURN', label: 'Return', color: '#8B5CF6' },
  EMERGENCY: { value: 'EMERGENCY', label: 'Emergency', color: '#EF4444' },
  MAINTENANCE: { value: 'MAINTENANCE', label: 'Maintenance', color: '#F59E0B' },
} as const;

// Appointment Status with labels
export const APPOINTMENT_STATUS = {
  SCHEDULED: { value: 'SCHEDULED', label: 'Scheduled', color: '#6B7280' },
  CONFIRMED: { value: 'CONFIRMED', label: 'Confirmed', color: '#3B82F6' },
  WAITING: { value: 'WAITING', label: 'Waiting', color: '#F59E0B' },
  IN_PROGRESS: { value: 'IN_PROGRESS', label: 'In Progress', color: '#8B5CF6' },
  COMPLETED: { value: 'COMPLETED', label: 'Completed', color: '#10B981' },
  NO_SHOW: { value: 'NO_SHOW', label: 'No Show', color: '#EF4444' },
  CANCELLED: { value: 'CANCELLED', label: 'Cancelled', color: '#9CA3AF' },
} as const;

// Treatment Status
export const TREATMENT_STATUS = {
  PLANNED: { value: 'PLANNED', label: 'Planned', color: '#6B7280' },
  IN_PROGRESS: { value: 'IN_PROGRESS', label: 'In Progress', color: '#F59E0B' },
  COMPLETED: { value: 'COMPLETED', label: 'Completed', color: '#10B981' },
  CANCELLED: { value: 'CANCELLED', label: 'Cancelled', color: '#9CA3AF' },
} as const;

// Tooth Status
export const TOOTH_STATUS = {
  HEALTHY: { value: 'HEALTHY', label: 'Healthy', color: '#10B981' },
  CARIES: { value: 'CARIES', label: 'Caries', color: '#EF4444' },
  RESTORATION: { value: 'RESTORATION', label: 'Restoration', color: '#3B82F6' },
  EXTRACTION: { value: 'EXTRACTION', label: 'Extraction', color: '#9CA3AF' },
  IMPLANT: { value: 'IMPLANT', label: 'Implant', color: '#8B5CF6' },
  CROWN: { value: 'CROWN', label: 'Crown', color: '#F59E0B' },
  MISSING: { value: 'MISSING', label: 'Missing', color: '#374151' },
  IMPACTED: { value: 'IMPACTED', label: 'Impacted', color: '#DC2626' },
} as const;

// FDI Tooth Notation (International Standard)
export const ADULT_TEETH = {
  // Upper Right (Quadrant 1)
  '18': 'Third Molar',
  '17': 'Second Molar',
  '16': 'First Molar',
  '15': 'Second Premolar',
  '14': 'First Premolar',
  '13': 'Canine',
  '12': 'Lateral Incisor',
  '11': 'Central Incisor',
  // Upper Left (Quadrant 2)
  '21': 'Central Incisor',
  '22': 'Lateral Incisor',
  '23': 'Canine',
  '24': 'First Premolar',
  '25': 'Second Premolar',
  '26': 'First Molar',
  '27': 'Second Molar',
  '28': 'Third Molar',
  // Lower Left (Quadrant 3)
  '31': 'Central Incisor',
  '32': 'Lateral Incisor',
  '33': 'Canine',
  '34': 'First Premolar',
  '35': 'Second Premolar',
  '36': 'First Molar',
  '37': 'Second Molar',
  '38': 'Third Molar',
  // Lower Right (Quadrant 4)
  '41': 'Central Incisor',
  '42': 'Lateral Incisor',
  '43': 'Canine',
  '44': 'First Premolar',
  '45': 'Second Premolar',
  '46': 'First Molar',
  '47': 'Second Molar',
  '48': 'Third Molar',
} as const;

// Default appointment duration in minutes
export const DEFAULT_APPOINTMENT_DURATION = 30;

// Working hours defaults
export const DEFAULT_WORKING_HOURS = {
  start: '08:00',
  end: '18:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
};

// Brazilian states
export const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
] as const;
