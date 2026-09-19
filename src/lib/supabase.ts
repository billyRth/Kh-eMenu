import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_KEY as string;

export const supabase = createClient(url, key);

export const IMAGE_BUCKET = 'menu-images';

/** Turn a Postgres exception raised by our RPCs into something a diner can read. */
export function friendlyError(message: string | undefined): string {
  if (!message) return 'Something went wrong. Please try again.';
  if (message.includes('TABLE_NOT_FOUND')) return 'This table QR code is no longer active. Please ask a staff member.';
  if (message.includes('ORDERING_DISABLED')) return 'Ordering from the table is paused right now. Please ask a staff member.';
  if (message.includes('TOO_MANY_ORDERS')) return 'Too many orders from this table in a short time. Please ask a staff member.';
  if (message.includes('ITEM_SOLD_OUT:')) return `Sorry, ${message.split('ITEM_SOLD_OUT:')[1]?.trim()} just sold out. Please remove it and try again.`;
  if (message.includes('OPTION_REQUIRED:')) return `Please choose ${message.split('OPTION_REQUIRED:')[1]?.trim()} for your dish.`;
  if (message.includes('OPTION_INVALID')) return 'One of your dish options changed. Please remove it and add it again.';
  if (message.includes('ITEM_NOT_FOUND')) return 'An item in your order is no longer on the menu. Please remove it and try again.';
  if (message.toLowerCase().includes('failed to fetch')) return 'No internet connection. Please check your connection and try again.';
  return message;
}
