export type UserRole = 'ADMIN' | 'USER' | 'SHOP_OWNER' | 'STAFF';

export interface User {
  id?: string | number;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  token?: string;
  requiresEmailUpdate?: boolean;
}

export interface Clinic {
  id: number;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  hours: string;
  distance: string;
  price: string;
  tags: string[];
  image: string;
  verified: boolean;
  badge?: string | null;
}

export interface PetMeal {
  mealName: string;
  foodType: string;
  amount: string;
}

export interface PetMedicalRecord {
  id?: number;
  diagnosis: string;
  treatment: string;
  prescription: string;
  visitDate: string;
  veterinarianNote: string;
  staffName?: string;
}

export interface PetVaccination {
  id?: number;
  name: string;
  drug: string;
  clinic: string;
  date: string;
  status: 'done' | 'upcoming';
}

export interface PetReminder {
  id?: number;
  title: string;
  description: string;
  date: string;
  type: 'medicine' | 'spa' | 'checkup' | 'other';
  status: 'active' | 'completed' | 'cancelled';
}

export interface PetImage {
  id?: number;
  imageUrl: string;
  description?: string;
  uploadDate?: string;
}

export interface Pet {
  id: number;
  name: string;
  species: string;
  breed: string;
  gender: string;
  color: string;
  avatar: string;
  sterilized: boolean;
  weight: number;
  dob: string;
  healthNote: string;
  favoriteFood?: string;
  allergies?: string;
  hobbies?: string;
  walkTime?: string;
  nutritionPlan?: PetMeal[];
  medicalRecords?: PetMedicalRecord[];
  ownerFullName?: string;
  active: boolean;
  unactiveReason?: string;
  documents?: PetDocument[];
  vaccinations?: PetVaccination[];
  reminders?: PetReminder[];
  album?: PetImage[];
}

export interface PetDocument {
  id: number;
  documentType: string;
  fileUrl: string;
  uploadDate: string;
  description?: string;
}
