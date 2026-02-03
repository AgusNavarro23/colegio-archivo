import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import jsPDF from 'jspdf';

// Verificar token
function verifyToken(token: string) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Obtener la solicitud
    const requestDoc = await db.request.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!requestDoc) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    // Verificar que el usuario sea el propietario o un empleado/admin
    if (
      requestDoc.userId !== decoded.userId &&
      decoded.role !== 'EMPLOYEE' &&
      decoded.role !== 'ADMIN'
    ) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (requestDoc.status !== 'PAID') {
      return NextResponse.json(
        { error: 'La solicitud no ha sido pagada' },
        { status: 400 }
      );
    }

    // Generar PDF
    const doc = new jsPDF();

    // Header
    doc.setFillColor(125, 33, 63); // #7d213f
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Notaría Digital', 105, 25, { align: 'center' });

    // Título del documento
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Constancia de Trámite', 105, 60, { align: 'center' });

    // Línea separadora
    doc.setDrawColor(125, 33, 63);
    doc.setLineWidth(0.5);
    doc.line(20, 70, 190, 70);

    // Información del trámite
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    let yPosition = 85;

    const addField = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(125, 33, 63);
      doc.text(`${label}:`, 20, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(value, 70, yPosition);
      yPosition += 12;
    };

    addField('ID de Trámite', requestDoc.id);
    addField('Título', requestDoc.title);
    addField('Tipo de Trámite', requestDoc.requestType);
    addField('Cliente', requestDoc.user.name || 'N/A');
    addField('Email', requestDoc.user.email);
    addField(
      'Fecha',
      new Date(requestDoc.createdAt).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    );

    // Descripción
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(125, 33, 63);
    doc.text('Descripción:', 20, yPosition);
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const descriptionLines = doc.splitTextToSize(requestDoc.description, 170);
    doc.text(descriptionLines, 20, yPosition);
    yPosition += descriptionLines.length * 6 + 10;

    // Estado
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(20, yPosition, 170, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Estado: PAGADO', 105, yPosition + 7, { align: 'center' });
    yPosition += 20;

    // ID de transacción
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    addField('ID de Transacción', requestDoc.transactionId || 'N/A');

    // Footer
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Página ${i} de ${pageCount} | © 2024 Notaría Digital | Documento generado automáticamente`,
        105,
        285,
        { align: 'center' }
      );
    }

    // Generar el PDF como buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="tramite_${requestDoc.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Generate PDF error:', error);
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 });
  }
}