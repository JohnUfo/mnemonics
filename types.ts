import { LucideIcon } from 'lucide-react';

export enum CategoryId {
  NUMBERS = 'numbers',
  WORDS = 'words',
  FLASH_CARDS = 'flash_cards',
  FACES_NAMES = 'faces_names',
  CARDS = 'cards',
  PICTURES = 'pictures',
}

export type CategoryStatus = 'ready' | 'wip';

export interface CategoryItem {
  id: CategoryId;
  title: string;
  icon: LucideIcon;
  isNew?: boolean;
  status: CategoryStatus;
  promptTopic: string;
}

export interface FlashCardData {
  front: string;
  back: string;
  hint?: string;
}

export interface User {
  id: string; // UUID from Supabase
  username: string;
  email?: string;
  is_online: boolean;
  avatar_id: number;
}
