// src/types/profile.ts
// Interfaces pour le service de profil utilisateur

export interface UserProfile {
  id?: string;
  device_id: string;
  username: string;
  email?: string;
  password_hash?: string;
  profile_data: {
    theme?: 'light' | 'dark';
    language?: 'fr' | 'en';
    notifications?: boolean;
    email?: string;
    phone?: string;
    social_x?: string;
    social_fb?: string;
    profile_photo?: {
      uuid: string;
      original_filename: string;
      format: string;
      size: number;
      url: string;
      created_at: string;
      metadata?: {
        width?: number;
        height?: number;
        device_type?: string;
        app_version?: string;
      };
    };
    reading_preferences?: {
      font_size?: 'small' | 'medium' | 'large';
      auto_download?: boolean;
      night_mode?: boolean;
      data_saver?: boolean;
    };
    ui_preferences?: {
      layout?: 'list' | 'grid';
      items_per_page?: number;
    };
  };
  app_name: 'FAM';
  last_seen?: string;
  last_sync?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface ProfileConflict {
  type: 'device_id_changed' | 'username_taken' | 'email_taken' | 'sync_conflict';
  localData: UserProfile;
  remoteData: UserProfile;
  message: string;
}

export interface SyncResult {
  success: boolean;
  conflict?: ProfileConflict;
  message: string;
  timestamp?: string;
}

export interface ProfileStats {
  id: string;
  username: string;
  app_name: string;
  last_seen: string;
  last_sync: string;
  saved_articles_count: number;
  last_article_saved: string;
  activity_status: 'active' | 'inactive' | 'dormant';
}

export interface ProfileRegistration {
  username: string;
  email: string;
  password: string;
  device_id: string;
  preferences?: Partial<UserProfile['profile_data']>;
}

export interface DeviceInfo {
  device_id: string;
  platform: 'ios' | 'android' | 'web';
  app_version: string;
  timestamp: string;
}

// Types pour les préférences utilisateur
export type ThemePreference = 'light' | 'dark' | 'auto';
export type LanguagePreference = 'fr' | 'en' | 'sw';
export type FontSizePreference = 'small' | 'medium' | 'large';
export type LayoutPreference = 'list' | 'grid';

// Énumérations pour les statuts
export enum ProfileStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive', 
  DORMANT = 'dormant',
  SUSPENDED = 'suspended'
}

export enum SyncStatus {
  SUCCESS = 'success',
  CONFLICT = 'conflict',
  ERROR = 'error',
  OFFLINE = 'offline'
}

// Configuration par défaut
export const DEFAULT_PROFILE_PREFERENCES = {
  theme: 'light' as const,
  language: 'fr' as const,
  notifications: true,
  reading_preferences: {
    font_size: 'medium' as const,
    auto_download: false,
    night_mode: false,
    data_saver: true
  },
  ui_preferences: {
    layout: 'list' as const,
    items_per_page: 10
  }
};
