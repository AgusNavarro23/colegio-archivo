import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const createRequestSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  requestType: z.string().min(1, 'El tipo de trámite es requerido'),
});

// Verificar token
function verifyToken(token: string) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
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

    // Obtener solicitudes del usuario
    const requests = await db.request.findMany({
      where: { userId: decoded.userId },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Get requests error:', error);
    return NextResponse.json({ error: 'Error al cargar solicitudes' }, { status: 500 });
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
    const { title, description, requestType } = createRequestSchema.parse(body);

    const newRequest = await db.request.create({
      data: {
        userId: decoded.userId,
        title,
        description,
        requestType,
        status: 'PENDING',
      },
      include: { user: { select: { email: true, name: true } } },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error('Create request error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.format()._errors[0] },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Error al crear solicitud' }, { status: 500 });
  }
}