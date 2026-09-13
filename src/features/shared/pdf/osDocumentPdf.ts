import type { OSDocumentData, OSDocumentLineItem } from './types';
import { formatCurrency } from '@/lib/formatters';

const PAGE_MARGIN = 12;
const INK = '#1b2129';
const INK_MUTED = '#565f6b';
const BRAND = '#4f46e5';
const LINE = '#d9dbd1';

/** jsPDF + autotable are ~180KB combined — loaded only when a PDF is actually requested. */
async function loadPdfLibs() {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { JsPDF, autoTable };
}

function drawFuelGauge(doc: InstanceType<Awaited<ReturnType<typeof loadPdfLibs>>['JsPDF']>, x: number, y: number) {
  // Static gauge illustration (not bound to real data) — matches the reference OS
  // model, which shows the same fixed E···1/2···F dial on every printed order.
  const width = 26;
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + width, y);
  [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
    const tx = x + width * t;
    doc.line(tx, y - 1.2, tx, y + 1.2);
  });
  doc.setFontSize(6.5);
  doc.setTextColor(INK_MUTED);
  doc.text('E', x, y + 4.5);
  doc.text('1/2', x + width / 2, y + 4.5, { align: 'center' });
  doc.text('F', x + width, y + 4.5, { align: 'right' });
}

function labelValueRow(
  doc: InstanceType<Awaited<ReturnType<typeof loadPdfLibs>>['JsPDF']>,
  pairs: [string, string | undefined][],
  x: number,
  y: number,
  colWidth: number,
) {
  pairs.forEach(([label, value], i) => {
    const cx = x + i * colWidth;
    doc.setFontSize(7);
    doc.setTextColor(INK_MUTED);
    doc.text(label.toUpperCase(), cx, y);
    doc.setFontSize(9.5);
    doc.setTextColor(INK);
    doc.text(value?.trim() || '—', cx, y + 4.5);
  });
}

function itemRows(items: OSDocumentLineItem[]): (string | number)[][] {
  return items.map((item, i) => [
    String(i + 1),
    item.descricao,
    item.quantidade.toLocaleString('pt-BR'),
    formatCurrency(item.valorUnitario),
    formatCurrency(item.valorTotal),
  ]);
}

export async function renderOSDocumentPdf(data: OSDocumentData): Promise<Blob> {
  const { JsPDF, autoTable } = await loadPdfLibs();
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  // ---- Letterhead ----
  let letterheadX = PAGE_MARGIN;
  if (data.oficina.logo) {
    const alturaLogo = 15;
    let larguraLogo = alturaLogo * (data.oficina.logo.largura / data.oficina.logo.altura);
    if (!Number.isFinite(larguraLogo) || larguraLogo <= 0) larguraLogo = alturaLogo;
    larguraLogo = Math.min(larguraLogo, 30);
    doc.addImage(data.oficina.logo.dataUrl, 'PNG', PAGE_MARGIN, y - 1, larguraLogo, alturaLogo);
    letterheadX = PAGE_MARGIN + larguraLogo + 4;
  }
  doc.setFontSize(15);
  doc.setTextColor(BRAND);
  doc.setFont('helvetica', 'bold');
  doc.text(data.oficina.nomeFantasia || data.oficina.razaoSocial, letterheadX, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(INK_MUTED);
  doc.text(`${data.oficina.razaoSocial} · CNPJ ${data.oficina.cnpj}`, letterheadX, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(INK);
  doc.text(data.tipoDocumento.toUpperCase(), pageWidth - PAGE_MARGIN, y + 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(INK_MUTED);
  doc.text(`Nº ${data.numero} · Status: ${data.status}`, pageWidth - PAGE_MARGIN, y + 9, { align: 'right' });
  doc.text(`Emitido em ${data.dataEmissao}`, pageWidth - PAGE_MARGIN, y + 13, { align: 'right' });

  y += 18;
  doc.setDrawColor(LINE);
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
  y += 6;

  // ---- Placa / Consultor / Previsão de entrega ----
  const topCols = [
    ['Placa', data.veiculo.placa],
    ['Consultor', data.consultor],
    ['Previsão de entrega', data.previsaoEntrega],
  ] as [string, string | undefined][];
  labelValueRow(doc, topCols, PAGE_MARGIN, y, contentWidth / 3);
  y += 10;
  doc.setDrawColor(LINE);
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
  y += 6;

  // ---- Cliente ----
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(INK);
  doc.text('CLIENTE', PAGE_MARGIN, y);
  y += 5;
  labelValueRow(
    doc,
    [
      ['Nome', data.cliente.nome],
      [data.cliente.tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF', data.cliente.documento],
    ],
    PAGE_MARGIN,
    y,
    contentWidth / 2,
  );
  y += 10;
  labelValueRow(
    doc,
    [
      ['Endereço', `${data.cliente.endereco}${data.cliente.cep ? ' · CEP ' + data.cliente.cep : ''}`],
      ['Bairro / Cidade / UF', data.cliente.bairroCidadeUf],
    ],
    PAGE_MARGIN,
    y,
    contentWidth / 2,
  );
  y += 10;
  labelValueRow(
    doc,
    [
      ['Telefone', data.cliente.telefone],
      ['E-mail', data.cliente.email],
    ],
    PAGE_MARGIN,
    y,
    contentWidth / 2,
  );
  y += 10;

  doc.setDrawColor(LINE);
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
  y += 6;

  // ---- Veículo ----
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(INK);
  doc.text('VEÍCULO', PAGE_MARGIN, y);
  y += 5;
  labelValueRow(
    doc,
    [
      ['Veículo', data.veiculo.descricao],
      ['Placa', data.veiculo.placa],
      ['Chassi', data.veiculo.chassi],
    ],
    PAGE_MARGIN,
    y,
    contentWidth / 3,
  );
  y += 10;
  labelValueRow(
    doc,
    [
      ['Ano fab./modelo', data.veiculo.anoFabricacaoModelo],
      ['Cor', data.veiculo.cor],
      ['KM atual', data.veiculo.kmAtual],
    ],
    PAGE_MARGIN,
    y,
    contentWidth / 3,
  );
  doc.setFontSize(7);
  doc.setTextColor(INK_MUTED);
  doc.text('COMBUSTÍVEL', PAGE_MARGIN + (contentWidth / 3) * 3 - 30, y);
  drawFuelGauge(doc, PAGE_MARGIN + (contentWidth / 3) * 3 - 30, y + 6);
  y += 14;

  // ---- Solicitação do cliente ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(INK);
  doc.text('SOLICITAÇÃO DO CLIENTE', PAGE_MARGIN, y);
  y += 2;
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [['Item', 'Descrição']],
    body: data.solicitacaoCliente
      ? data.solicitacaoCliente
          .split('\n')
          .filter((line) => line.trim())
          .map((line, i) => [String(i + 1), line])
      : [['—', 'Nenhum relato registrado']],
    styles: { fontSize: 8.5, textColor: INK, cellPadding: 2 },
    headStyles: { fillColor: [232, 234, 226], textColor: INK_MUTED, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 12 } },
  });
  // @ts-expect-error autotable augments doc at runtime with lastAutoTable
  y = doc.lastAutoTable.finalY + 8;

  // ---- Serviço técnico ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(INK);
  doc.text('SERVIÇO TÉCNICO', PAGE_MARGIN, y);
  y += 2;
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [['Item', 'Descrição do serviço', 'Qtd.', 'Valor unit.', 'Valor total']],
    body:
      data.servicos.length > 0
        ? itemRows(data.servicos)
        : [['—', 'Nenhum serviço lançado', '', '', '']],
    styles: { fontSize: 8.5, textColor: INK, cellPadding: 2 },
    headStyles: { fillColor: [232, 234, 226], textColor: INK_MUTED, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 12 }, 2: { cellWidth: 18 }, 3: { cellWidth: 26 }, 4: { cellWidth: 26 } },
    foot: [
      [
        { content: 'Total de serviços', colSpan: 4, styles: { halign: 'right' } },
        formatCurrency(data.totalServicos),
      ],
    ],
    footStyles: { fillColor: [255, 255, 255], textColor: INK, fontStyle: 'bold' },
  });
  // @ts-expect-error autotable augments doc at runtime with lastAutoTable
  y = doc.lastAutoTable.finalY + 8;

  // ---- Peças e lubrificantes ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(INK);
  doc.text('PEÇAS E LUBRIFICANTES', PAGE_MARGIN, y);
  y += 2;
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [['Item', 'Descrição', 'Qtd.', 'Valor unit.', 'Valor total']],
    body: data.pecas.length > 0 ? itemRows(data.pecas) : [['—', 'Nenhuma peça lançada', '', '', '']],
    styles: { fontSize: 8.5, textColor: INK, cellPadding: 2 },
    headStyles: { fillColor: [232, 234, 226], textColor: INK_MUTED, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 12 }, 2: { cellWidth: 18 }, 3: { cellWidth: 26 }, 4: { cellWidth: 26 } },
    foot: [
      [{ content: 'Total de peças', colSpan: 4, styles: { halign: 'right' } }, formatCurrency(data.totalPecas)],
    ],
    footStyles: { fillColor: [255, 255, 255], textColor: INK, fontStyle: 'bold' },
  });
  // @ts-expect-error autotable augments doc at runtime with lastAutoTable
  y = doc.lastAutoTable.finalY + 8;

  // ---- Total geral ----
  doc.setFillColor(BRAND);
  doc.roundedRect(pageWidth - PAGE_MARGIN - 70, y, 70, 12, 1.5, 1.5, 'F');
  doc.setTextColor('#ffffff');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL GERAL', pageWidth - PAGE_MARGIN - 66, y + 5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(data.totalGeral), pageWidth - PAGE_MARGIN - 66, y + 9.5);
  y += 18;

  // ---- Execução (only meaningful for Ordens de Serviço) ----
  if (data.consultor || data.dataAbertura || data.dataConclusao) {
    doc.setDrawColor(LINE);
    doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
    y += 6;
    labelValueRow(
      doc,
      [
        ['Tec. responsável', data.consultor],
        ['Início', data.dataAbertura],
        ['Término', data.dataConclusao],
      ],
      PAGE_MARGIN,
      y,
      contentWidth / 3,
    );
    y += 12;
  }

  if (data.observacoes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(INK);
    doc.text('OBSERVAÇÕES', PAGE_MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(INK_MUTED);
    const wrapped = doc.splitTextToSize(data.observacoes, contentWidth);
    doc.text(wrapped, PAGE_MARGIN, y);
  }

  return doc.output('blob');
}
