import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// 1. Actualizamos el esquema de validación
const createRequestSchema = z.object({
  requestType: z.enum(['Copia de Entrada', 'Copia Digital']),
  deedNumber: z.string().min(1, 'El N° de escritura es requerido'),
  year: z.string().min(4, 'El año es requerido'),
  notary: z.string().min(1, 'El escribano es requerido'),
  parties: z.string().min(1, 'Las partes son requeridas'),
});

// ... (mantén la función verifyToken igual) ...
function verifyToken(token: string) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// ... (mantén el método GET igual) ...
export async function GET(request: NextRequest) {
  // ... mismo código que tenías ...
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const requests = await db.request.findMany({
      where: { userId: decoded.userId },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    
    // 2. Parseamos los nuevos campos
    const { requestType, deedNumber, year, notary, parties } = createRequestSchema.parse(body);

    // 3. Generamos título y descripción automáticos para compatibilidad
    const autoTitle = `Escritura N° ${deedNumber} (${year})`;
    const autoDescription = `Escribano: ${notary} | Partes: ${parties}`;

    const newRequest = await db.request.create({
      data: {
        userId: decoded.userId,
        // Guardamos los campos específicos
        requestType,
        deedNumber,
        year,
        notary,
        parties,
        // Guardamos los campos generados
        title: autoTitle,
        description: autoDescription,
        status: 'PENDING',
      },
      include: { user: { select: { email: true, name: true } } },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error('Create request error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.format()._errors[0] }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al crear solicitud' }, { status: 500 });
  }
}