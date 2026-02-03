import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
  // CORRECCIÓN: Definimos params como una Promesa
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Esperamos a que los parámetros se resuelvan
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

    // 2. Usamos el id extraído correctamente
    const updatedRequest = await db.request.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: { user: { select: { email: true, name: true } } },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Approve request error:', error);
    
    // Captura si el ID no existe en la BD
    // @ts-ignore
    if (error.code === 'P2025') {
       return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Error al aprobar solicitud' }, { status: 500 });
  }
}