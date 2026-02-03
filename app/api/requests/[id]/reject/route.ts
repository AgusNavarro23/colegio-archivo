import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const rejectSchema = z.object({
  reason: z.string().min(1, 'El motivo es requerido'),
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

export async function POST(
  request: NextRequest,
  // CORRECCIÓN: Tipar params como Promise y esperar su resolución
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Esperamos a que los params se resuelvan (Requerido en Next.js 15)
    const { id } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || (decoded.role !== 'ADMIN' && decoded.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { reason } = rejectSchema.parse(body);

    // 2. Usamos el id extraído
    const updatedRequest = await db.request.update({
      where: { id }, 
      data: { status: 'REJECTED', rejectionReason: reason },
      include: { user: { select: { email: true, name: true } } },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Reject request error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    
    // Captura el error específico de registro no encontrado
    // @ts-ignore
    if (error.code === 'P2025') {
       return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Error al rechazar solicitud' }, { status: 500 });
  }
}