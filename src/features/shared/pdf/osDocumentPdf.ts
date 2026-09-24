import type { OSDocumentData, OSDocumentLineItem } from './types';
import { formatCurrency } from '@/lib/formatters';

const PAGE_MARGIN = 12;
const INK = '#1b2129';
const INK_MUTED = '#565f6b';
// Laranja-sinal da identidade da MotoGest (mesmo --brand-600/--brand-700 do
// app — ver index.css), não o índigo genérico que estava aqui antes.
const BRAND = '#ff5a1f'; // brand-600 — preenchimentos sólidos (faixa, caixa de total)
const BRAND_TEXT = '#d9450f'; // brand-700 — texto sobre fundo claro, mesmo padrão de text-brand-700 no app
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

/** Corta um texto na largura disponível (com reticências) — o cabeçalho tem uma linha por dado. */
function primeiraLinha(doc: InstanceType<Awaited<ReturnType<typeof loadPdfLibs>>['JsPDF']>, texto: string, largura: number): string {
  const linhas: string[] = doc.splitTextToSize(texto, largura);
  return linhas.length > 1 ? `${linhas[0].replace(/\s+\S*$/, '')}…` : (linhas[0] ?? '');
}

/** Rodapé em todas as páginas: identificação da oficina + paginação. */
function drawFooters(doc: InstanceType<Awaited<ReturnType<typeof loadPdfLibs>>['JsPDF']>, data: OSDocumentData) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  const identificacao = [data.oficina.nomeFantasia || data.oficina.razaoSocial, data.oficina.contato]
    .filter(Boolean)
    .join(' · ');
  for (let pagina = 1; pagina <= total; pagina++) {
    doc.setPage(pagina);
    doc.setDrawColor(LINE);
    doc.setLineWidth(0.3);
    doc.line(PAGE_MARGIN, pageHeight - 12, pageWidth - PAGE_MARGIN, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(INK_MUTED);
    doc.text(identificacao, PAGE_MARGIN, pageHeight - 8);
    doc.text(`${data.tipoDocumento} nº ${data.numero} · Página ${pagina} de ${total}`, pageWidth - PAGE_MARGIN, pageHeight - 8, {
      align: 'right',
    });
  }
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
  // Começa logo abaixo da faixa da marca (ver Letterhead).
  let y = 10;

  // ---- Letterhead ----
  // Faixa fina na cor da marca no topo da folha + cabeçalho da oficina
  // (logo, nome, razão social/CNPJ, endereço, contato) à esquerda e o quadro
  // de identificação do documento à direita. Linhas sem dado (perfil que
  // recebe a oficina resumida) são omitidas, nunca impressas vazias.
  doc.setFillColor(BRAND);
  doc.rect(0, 0, pageWidth, 3, 'F');

  const boxWidth = 58;
  const boxX = pageWidth - PAGE_MARGIN - boxWidth;
  let letterheadX = PAGE_MARGIN;
  let logoBottom = y;
  if (data.oficina.logo) {
    const alturaMax = 20;
    const larguraMax = 38;
    let largura = alturaMax * (data.oficina.logo.largura / data.oficina.logo.altura);
    if (!Number.isFinite(largura) || largura <= 0) largura = alturaMax;
    let altura = alturaMax;
    if (largura > larguraMax) {
      altura = alturaMax * (larguraMax / largura);
      largura = larguraMax;
    }
    doc.addImage(data.oficina.logo.dataUrl, 'PNG', PAGE_MARGIN, y, largura, altura);
    letterheadX = PAGE_MARGIN + largura + 5;
    logoBottom = y + altura;
  }
  const larguraTexto = boxX - 5 - letterheadX;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(BRAND_TEXT);
  doc.text(primeiraLinha(doc, data.oficina.nomeFantasia || data.oficina.razaoSocial, larguraTexto), letterheadX, y + 5);

  const linhasOficina = [
    [data.oficina.razaoSocial, data.oficina.cnpj ? `CNPJ ${data.oficina.cnpj}` : ''].filter(Boolean).join(' · '),
    data.oficina.endereco,
    data.oficina.contato,
  ].filter((linha): linha is string => !!linha);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(INK_MUTED);
  let textoY = y + 10.5;
  linhasOficina.forEach((linha) => {
    doc.text(primeiraLinha(doc, linha, larguraTexto), letterheadX, textoY);
    textoY += 4;
  });

  // Quadro do documento
  const linhasQuadro = [`Nº ${data.numero}`, `Status: ${data.status}`, `Emitido em ${data.dataEmissao}`];
  if (data.validade) linhasQuadro.push(`Válido até ${data.validade}`);
  const boxHeight = 10 + linhasQuadro.length * 4;
  doc.setDrawColor(BRAND);
  doc.setLineWidth(0.4);
  doc.roundedRect(boxX, y, boxWidth, boxHeight, 1.5, 1.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(BRAND_TEXT);
  doc.text(data.tipoDocumento.toUpperCase(), boxX + boxWidth / 2, y + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(INK);
  linhasQuadro.forEach((linha, i) => doc.text(linha, boxX + boxWidth / 2, y + 11 + i * 4, { align: 'center' }));

  y = Math.max(logoBottom, textoY - 2, y + boxHeight) + 5;
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.3);
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
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 16 },
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
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 16 },
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
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 16 },
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
  if (data.tecnicoResponsavel || data.dataAbertura || data.dataConclusao) {
    doc.setDrawColor(LINE);
    doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
    y += 6;
    labelValueRow(
      doc,
      [
        ['Tec. responsável', data.tecnicoResponsavel],
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

  drawFooters(doc, data);
  return doc.output('blob');
}
