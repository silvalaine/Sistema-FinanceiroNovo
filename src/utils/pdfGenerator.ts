import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatPercent, formatDate } from './formatters';

interface PDFSummaryMetrics {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  totalCards?: number;
}

interface GeneratePDFParams {
  reportType: string;
  reportTitle: string;
  periodLabel: string;
  filterDescription?: string;
  summary: PDFSummaryMetrics;
  cardCategoryData?: {
    byCardList: Array<{
      card: { name: string; brand: string };
      total: number;
      count: number;
      pctOfAllCards: number;
      categories: Array<{
        category: { name: string };
        total: number;
        count: number;
        pctOfCard: number;
        subcategories: Array<{
          subName: string;
          total: number;
          count: number;
          pctOfCategory: number;
        }>;
        txs?: Array<{
          description: string;
          amount: number;
          purchaseDate?: string;
          dueDate?: string;
        }>;
      }>;
    }>;
  };
  categorySubcategoryData?: {
    typeLabel: string;
    totalFiltered?: number;
    items: Array<{
      category: { name: string };
      total: number;
      count: number;
      pctOfTotal: number;
      avgTicket: number;
      subcategories: Array<{
        name: string;
        total: number;
        count: number;
        pctOfCategory: number;
        avgTicket: number;
      }>;
    }>;
  };
  dreData?: {
    incomeCategories: Array<{ category: { name: string }; total: number; count: number }>;
    expenseCategories: Array<{ category: { name: string }; total: number; count: number }>;
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    savingsRate: number;
  };
  futureInstallmentsData?: Array<{
    monthKey: string;
    total: number;
    items: Array<{
      tx: { 
        description: string; 
        amount: number; 
        installment?: { current: number; total: number }; 
        status: string;
        purchaseDate?: string;
        dueDate?: string;
      };
      card?: { name: string };
    }>;
  }>;
  monthlyComparisonData?: Array<{
    monthKey: string;
    income: number;
    expense: number;
    netBalance: number;
    expensePctChange: number;
  }>;
}

export const generateAndDownloadPDF = (params: GeneratePDFParams): boolean => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 15;

    // 1. BRANDING & HEADER
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('FinanPlan', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225); // Slate-300
    doc.text('Relatório Financeiro & Gerencial', 14, 17);

    // Generation timestamp on right
    doc.setFontSize(8);
    const dateStr = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(`Gerado em: ${dateStr}`, pageWidth - 14, 15, { align: 'right' });

    currentY = 32;

    // 2. REPORT TITLE & METADATA
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(params.reportTitle, 14, currentY);

    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    let subtitleText = `Período: ${params.periodLabel}`;
    if (params.filterDescription) {
      subtitleText += ` · ${params.filterDescription}`;
    }
    doc.text(subtitleText, 14, currentY);

    currentY += 8;

    // 3. EXECUTIVE SUMMARY METRICS BOX
    const boxX = 14;
    const boxWidth = pageWidth - 28;
    const boxHeight = 18;

    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.roundedRect(boxX, currentY, boxWidth, boxHeight, 2, 2, 'FD');

    const metricY = currentY + 6;
    const valY = currentY + 13;

    if (params.reportType === 'card_category') {
      // Relatório por Cartão e Categoria: exibir no cabeçalho em PDF somente Faturas em Cartões
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Faturas em Cartões', boxX + 6, metricY);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229); // Indigo-600
      doc.text(formatCurrency(params.summary.totalCards || 0), boxX + 6, valY);
    } else if (params.reportType === 'category_subcategory') {
      // Relatório Categorias & Sub: exibir no cabeçalho em PDF somente o Total Realizado pelo Filtro
      const isExpense = params.categorySubcategoryData?.typeLabel?.toLowerCase().includes('despesa');
      const totalVal = params.categorySubcategoryData?.totalFiltered ?? (isExpense ? params.summary.totalExpense : params.summary.totalIncome);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Total Realizado pelo Filtro', boxX + 6, metricY);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isExpense ? 225 : 16, isExpense ? 29 : 185, isExpense ? 72 : 129);
      doc.text(formatCurrency(totalVal), boxX + 6, valY);
    } else {
      const colWidth = boxWidth / 4;

      // Metric 1: Receitas
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Receitas Totais', boxX + 4, metricY);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // Emerald-600
      doc.text(`+ ${formatCurrency(params.summary.totalIncome)}`, boxX + 4, valY);

      // Metric 2: Despesas
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Despesas Totais', boxX + colWidth + 4, metricY);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(225, 29, 72); // Rose-600
      doc.text(`- ${formatCurrency(params.summary.totalExpense)}`, boxX + colWidth + 4, valY);

      // Metric 3: Saldo Líquido
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Saldo Líquido', boxX + colWidth * 2 + 4, metricY);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(params.summary.netBalance >= 0 ? 15 : 225, params.summary.netBalance >= 0 ? 23 : 29, params.summary.netBalance >= 0 ? 42 : 72);
      doc.text(formatCurrency(params.summary.netBalance), boxX + colWidth * 2 + 4, valY);

      // Metric 4: Faturas em Cartões
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Faturas em Cartões', boxX + colWidth * 3 + 4, metricY);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229); // Indigo-600
      doc.text(formatCurrency(params.summary.totalCards || 0), boxX + colWidth * 3 + 4, valY);
    }

    currentY += boxHeight + 8;

    // 4. REPORT CONTENT TABLES
    if (params.reportType === 'card_category' && params.cardCategoryData) {
      const tableRows: any[] = [];

      params.cardCategoryData.byCardList.forEach((cardGroup) => {
        // Group Header Row
        tableRows.push([
          {
            content: `CARTÃO: ${cardGroup.card.name.toUpperCase()}`,
            colSpan: 4,
            styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
          },
        ]);

        if (cardGroup.categories.length === 0) {
          tableRows.push([
            { content: 'Nenhum lançamento neste cartão para os filtros selecionados.', colSpan: 4, styles: { textColor: [148, 163, 184] } },
          ]);
        } else {
          cardGroup.categories.forEach((cat) => {
            tableRows.push([
              `• ${cat.category.name}`,
              `${cat.count} compra(s)`,
              `${formatPercent(cat.pctOfCard)} da fatura`,
              formatCurrency(cat.total),
            ]);

            cat.subcategories.forEach((sub) => {
              tableRows.push([
                `   - ${sub.subName}`,
                `${sub.count}`,
                `${formatPercent(sub.pctOfCategory)} da cat`,
                formatCurrency(sub.total),
              ]);
            });

            if (cat.txs && cat.txs.length > 0) {
              cat.txs.forEach((tx) => {
                const datesInfo = `${tx.purchaseDate ? `Compra: ${formatDate(tx.purchaseDate)}` : ''}${tx.dueDate ? ` · Venc: ${formatDate(tx.dueDate)}` : ''}`;
                tableRows.push([
                  `     ↳ ${tx.description}`,
                  datesInfo || '-',
                  'Lançamento',
                  formatCurrency(tx.amount),
                ]);
              });
            }
          });

          // Subtotal for Card
          tableRows.push([
            {
              content: `SUBTOTAL (${cardGroup.card.name}):`,
              colSpan: 3,
              styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] },
            },
            {
              content: formatCurrency(cardGroup.total),
              styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252], textColor: [225, 29, 72] },
            },
          ]);
        }
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Categoria / Subcategoria', 'Compras', '% do Cartão', 'Total (R$)']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { halign: 'center', cellWidth: 30 },
          2: { halign: 'right', cellWidth: 40 },
          3: { halign: 'right', cellWidth: 32 },
        },
      });
    } else if (params.reportType === 'category_subcategory' && params.categorySubcategoryData) {
      const tableRows: any[] = [];

      params.categorySubcategoryData.items.forEach((item) => {
        tableRows.push([
          { content: item.category.name, styles: { fontStyle: 'bold' } },
          `${item.count} lançamentos`,
          formatPercent(item.pctOfTotal),
          formatCurrency(item.avgTicket),
          { content: formatCurrency(item.total), styles: { fontStyle: 'bold' } },
        ]);

        item.subcategories.forEach((sub) => {
          tableRows.push([
            `   - ${sub.name}`,
            `${sub.count}`,
            `${formatPercent(sub.pctOfCategory)} da cat`,
            formatCurrency(sub.avgTicket),
            formatCurrency(sub.total),
          ]);
        });
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Categoria / Subcategoria', 'Qtd', '% do Total', 'Ticket Médio', 'Total (R$)']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right', fontStyle: 'bold' },
        },
      });
    } else if (params.reportType === 'income_statement' && params.dreData) {
      const tableRows: any[] = [];

      // Receitas Section
      tableRows.push([
        { content: '1. RECEITAS OPERACIONAIS', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [22, 101, 52] } },
      ]);
      params.dreData.incomeCategories.forEach((inc) => {
        tableRows.push([`   ${inc.category.name}`, `${inc.count} lançamentos`, formatCurrency(inc.total)]);
      });
      tableRows.push([
        { content: 'TOTAL DE RECEITAS:', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', textColor: [22, 101, 52] } },
        { content: `+ ${formatCurrency(params.dreData.totalIncome)}`, styles: { fontStyle: 'bold', halign: 'right', textColor: [22, 101, 52] } },
      ]);

      // Despesas Section
      tableRows.push([
        { content: '2. DESPESAS E CUSTOS', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [255, 241, 242], textColor: [159, 18, 57] } },
      ]);
      params.dreData.expenseCategories.forEach((exp) => {
        tableRows.push([`   ${exp.category.name}`, `${exp.count} lançamentos`, formatCurrency(exp.total)]);
      });
      tableRows.push([
        { content: 'TOTAL DE DESPESAS:', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', textColor: [159, 18, 57] } },
        { content: `- ${formatCurrency(params.dreData.totalExpense)}`, styles: { fontStyle: 'bold', halign: 'right', textColor: [159, 18, 57] } },
      ]);

      // Resultado Líquido
      tableRows.push([
        { content: 'RESULTADO LÍQUIDO DO PERÍODO:', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249] } },
        {
          content: formatCurrency(params.dreData.netBalance),
          styles: {
            fontStyle: 'bold',
            halign: 'right',
            fillColor: [241, 245, 249],
            textColor: params.dreData.netBalance >= 0 ? [22, 101, 52] : [159, 18, 57],
          },
        },
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Estrutura do Demonstrativo DRE', 'Contagem', 'Valor (R$)']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85] },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 105 },
          1: { halign: 'center', cellWidth: 35 },
          2: { halign: 'right', cellWidth: 42 },
        },
      });
    } else if (params.reportType === 'future_installments' && params.futureInstallmentsData) {
      const tableRows: any[] = [];

      params.futureInstallmentsData.forEach((m) => {
        tableRows.push([
          { content: `COMPETÊNCIA: ${m.monthKey} · Total: ${formatCurrency(m.total)}`, colSpan: 6, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        ]);

        m.items.forEach(({ tx, card }) => {
          tableRows.push([
            tx.description,
            card?.name || 'Não informado',
            tx.purchaseDate ? formatDate(tx.purchaseDate) : '-',
            tx.dueDate ? formatDate(tx.dueDate) : '-',
            tx.installment ? `${tx.installment.current}/${tx.installment.total}` : '1/1',
            formatCurrency(tx.amount),
          ]);
        });
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Descrição', 'Cartão', 'Data Compra', 'Venc. Cartão', 'Parcela', 'Valor (R$)']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 54 },
          1: { cellWidth: 32 },
          2: { halign: 'center', cellWidth: 26 },
          3: { halign: 'center', cellWidth: 26 },
          4: { halign: 'center', cellWidth: 18 },
          5: { halign: 'right', cellWidth: 26 },
        },
      });
    } else if (params.reportType === 'monthly_comparison' && params.monthlyComparisonData) {
      const tableRows: any[] = params.monthlyComparisonData.map((m) => [
        m.monthKey,
        `+ ${formatCurrency(m.income)}`,
        `- ${formatCurrency(m.expense)}`,
        formatCurrency(m.netBalance),
        m.expensePctChange !== 0 ? formatPercent(m.expensePctChange) : '-',
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Mês de Competência', 'Receitas', 'Despesas', 'Saldo Líquido', 'Variação Despesas']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'right', textColor: [16, 185, 129] },
          2: { halign: 'right', textColor: [225, 29, 72] },
          3: { halign: 'right', fontStyle: 'bold' },
          4: { halign: 'right' },
        },
      });
    }

    // 5. FOOTER ON ALL PAGES
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.setDrawColor(226, 232, 240);
      doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
      doc.text('FinanPlan · Sistema de Gestão Financeira', 14, pageHeight - 7);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
    }

    // Save/Download PDF file
    const cleanFileName = `FinanPlan_${params.reportType}_${Date.now()}.pdf`;
    doc.save(cleanFileName);
    return true;
  } catch (error) {
    console.error('Failed to generate PDF with jsPDF:', error);
    return false;
  }
};
