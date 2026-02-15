
export type ViolationCategory = 'SALAH LAKU RINGAN' | 'SALAH LAKU SEDERHANA' | 'SALAH LAKU BERAT';

export interface DisciplineRecord {
  id: string;
  studentName: string;
  date: string;
  day: string;
  time: string;
  studentClass: string;
  category: ViolationCategory;
  violationType: string;
  demerit: number;
  location: string;
  reportedBy: string;
  actionTaken: string;
  details: string;
  createdAt: number;
}

export interface SchoolInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}
