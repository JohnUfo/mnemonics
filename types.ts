import { LucideIcon } from 'lucide-react';

export enum CategoryId {
  NUMBERS = 'numbers',
  WORDS = 'words',
  FLASH_CARDS = 'flash_cards',
  FACES_NAMES = 'faces_names',
  CARDS = 'cards',
  PICTURES = 'pictures',
}

export interface CategoryItem {
  id: CategoryId;
  title: string;
  icon: LucideIcon;
  isNew?: boolean;
  promptTopic: string;
}

export interface FlashCardData {
  front: string;
  back: string;
  hint?: string;
  imageUrl?: string;
}