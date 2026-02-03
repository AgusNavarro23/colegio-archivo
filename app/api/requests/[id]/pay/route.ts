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
  // CORRECCIÓN 1: Tipar params como Promise
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CORRECCIÓN 2: Esperar a que se resuelvan los parámetros
    const { id } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // CORRECCIÓN 3: Simulación de ID de Macro Click
    // En una integración real, aquí iniciarías la sesión de pago con la API de Banco Macro
    const transactionId = `MACRO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Actualizamos la solicitud usando el 'id' extraído correctamente
    const updatedRequest = await db.request.update({
      where: { id }, // Usamos la variable id, no params.id
      data: { status: 'PAID', transactionId },
      include: { user: { select: { email: true, name: true } } },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Pay request error:', error);
    
    // Captura si el ID no existe
    // @ts-ignore
    if (error.code === 'P2025') {
       return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Error al procesar pago' }, { status: 500 });
  }
}