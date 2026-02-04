import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return NextResponse.json({ error: '401' }, { status: 401 });

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    // Solo empleados/admin pueden validar
    if (!decoded || (decoded.role !== 'ADMIN' && decoded.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const updatedRequest = await db.request.update({
      where: { id },
      data: { pdfValidated: true }, // Marcamos como validado
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}