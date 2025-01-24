import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { type Database } from '@/lib/types/database.types';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  // Sign out the user
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL('/login', request.url), {
    status: 302,
  });
} 