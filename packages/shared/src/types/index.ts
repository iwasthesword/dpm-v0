// User Roles
export type UserRole = 'ADMIN' | 'DENTIST' | 'RECEPTIONIST' | 'ASSISTANT' | 'FINANCIAL';

// Gender
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

// Appointment Types
export type AppointmentType = 'EVALUATION' | 'TREATMENT' | 'RETURN' | 'EMERGENCY' | 'MAINTENANCE';

// Appointment Status
export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'WAITING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED';

// Treatment Status
export type TreatmentStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// Treatment Plan Status
export type TreatmentPlanStatus =
  | 'DRAFT'
  | 'PRESENTED'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED';

// Tooth Status
export type ToothStatus =
  | 'HEALTHY'
  | 'CARIES'
  | 'RESTORATION'
  | 'EXTRACTION'
  | 'IMPLANT'
  | 'CROWN'
  | 'MISSING'
  | 'IMPACTED';

// Message Channel
export type MessageChannel = 'WHATSAPP_TEXT' | 'WHATSAPP_AUDIO' | 'SMS' | 'EMAIL';

// Message Status
export type MessageStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

// Commission Type
export type CommissionType = 'PERCENTAGE' | 'FIXED' | 'PER_PROCEDURE';

// Address
export interface Address {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

// Guardian (for minors)
export interface Guardian {
  name: string;
  cpf: string;
  relationship: string;
  phone: string;
}

// Anamnesis
export interface Anamnesis {
  allergies: string[];
  medications: string[];
  diseases: string[];
  surgeries: string[];
  isPregnant?: boolean;
  notes?: string;
  lastUpdated?: Date;
}

// User
export interface User {
  id: string;
  clinicId: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

// Clinic
export interface Clinic {
  id: string;
  name: string;
  tradeName?: string;
  cnpj: string;
  email: string;
  phone: string;
  subdomain: string;
  timezone: string;
  logo?: string;
  address?: Address;
  createdAt: Date;
  updatedAt: Date;
}

// Patient
export interface Patient {
  id: string;
  clinicId: string;
  name: string;
  cpf?: string;
  birthDate?: Date;
  gender?: Gender;
  phone: string;
  phoneSecondary?: string;
  email?: string;
  photo?: string;
  address?: Address;
  guardian?: Guardian;
  anamnesis?: Anamnesis;
  tags: string[];
  notes?: string;
  source?: string;
  whatsappOptIn: boolean;
  smsOptIn: boolean;
  emailOptIn: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Professional
export interface Professional {
  id: string;
  clinicId: string;
  userId?: string;
  name: string;
  cro: string;
  croState: string;
  specialty?: string;
  photo?: string;
  color: string;
  isActive: boolean;
}

// Room
export interface Room {
  id: string;
  clinicId: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
}

// Appointment
export interface Appointment {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  roomId?: string;
  procedureId?: string;
  startTime: Date;
  endTime: Date;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  internalNotes?: string;
  confirmedAt?: Date;
  confirmedVia?: string;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Paginated Response
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth Tokens
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
