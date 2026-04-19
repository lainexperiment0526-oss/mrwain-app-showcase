export interface App {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string;
  category_id: string | null;
  tags: string[];
  is_featured: boolean;
  is_popular: boolean;
  version: string;
  created_at: string;
  updated_at: string;
  category?: Category;
  screenshots?: Screenshot[];
  // New App Store fields
  user_id: string | null;
  developer_name: string | null;
  age_rating: string;
  ratings_count: number;
  average_rating: number;
  views_count: number;
  whats_new: string | null;
  privacy_policy_url: string | null;
  terms_of_service_url: string | null;
  developer_website_url: string | null;
  compatibility: string;
  languages: string[];
  has_in_app_purchases: boolean;
  status: 'pending' | 'approved' | 'rejected';
  pricing_model: 'free' | 'paid';
  price_amount: number;
  payment_type: 'onetime' | 'monthly' | 'free';
  network_type: 'mainnet' | 'testnet' | 'beta';
  notes: string | null;
  launch_at: string | null;
  is_verified: boolean;
  verified_until: string | null;
  download_url?: string | null;
  openpay_link?: string | null;
  droppay_link?: string | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  created_at: string;
}

export interface Screenshot {
  id: string;
  app_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  is_admin: boolean;
  created_at: string;
}
