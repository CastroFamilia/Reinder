/**
 * apps/web/src/app/api/v1/buyer/preferences/route.ts
 *
 * API Route Handler — PATCH /api/v1/buyer/preferences
 * Guarda/actualiza las preferencias de búsqueda del comprador en Supabase.
 *
 * Story 2.9 — Task 3 (AC: 2)
 *
 * Body: { zones: string[], maxPrice?: number, minRooms?: number, minSqm?: number }
 * Response: ApiResponse<SearchPreferences>
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/db';
import { userProfiles } from '@reinder/shared/db/schema';
import { eq } from 'drizzle-orm';
import type { SearchPreferences } from '@reinder/shared';

/**
 * PATCH /api/v1/buyer/preferences
 * Body: SearchPreferences
 * Auth: Supabase session (cookie-based)
 */
export async function PATCH(request: Request) {
  try {
    // Auth: require authenticated buyer
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          data: null,
          error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida' },
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as Partial<SearchPreferences>;

    // Validación básica: zones es requerido
    if (!body.zones || !Array.isArray(body.zones)) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'El campo "zones" es requerido y debe ser un array',
          },
        },
        { status: 400 },
      );
    }

    const prefs: SearchPreferences = {
      zones: body.zones,
      ...(body.maxPrice != null && { maxPrice: body.maxPrice }),
      ...(body.minRooms != null && { minRooms: body.minRooms }),
      ...(body.minSqm != null && { minSqm: body.minSqm }),
    };

    // Persist to Supabase via Drizzle
    await db
      .update(userProfiles)
      .set({ searchPreferences: prefs })
      .where(eq(userProfiles.id, user.id));

    return NextResponse.json({ data: prefs, error: null }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: { code: 'INVALID_BODY', message: 'Body inválido — se esperaba JSON' },
      },
      { status: 400 },
    );
  }
}
