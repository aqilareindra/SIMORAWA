export type Role =
  | 'ADMIN'
  | 'BPH'
  | 'KADIV'
  | 'PIC'
  | 'BENDAHARA'
  | 'SEKRETARIS';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  BPH: 'BPH',
  KADIV: 'Kepala Divisi',
  PIC: 'PIC / Staff',
  BENDAHARA: 'Bendahara',
  SEKRETARIS: 'Sekretaris',
};

export const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'purple',
  BPH: 'blue',
  KADIV: 'geekblue',
  PIC: 'cyan',
  BENDAHARA: 'green',
  SEKRETARIS: 'orange',
};
