const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');

const generateRevenueExcel = async (deals, accounts) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SalesFlow System';
  workbook.lastModifiedBy = 'SalesFlow System';
  workbook.created = new Date();
  workbook.modified = new Date();


  const dealsSheet = workbook.addWorksheet('Deals Pipeline');
  dealsSheet.columns = [
    { header: 'Deal Title', key: 'title', width: 40 },
    { header: 'Value ($)', key: 'value', width: 15 },
    { header: 'Stage', key: 'stage', width: 15 },
    { header: 'Probability (%)', key: 'probability', width: 15 },
    { header: 'Owner', key: 'owner', width: 25 },
    { header: 'Created Date', key: 'createdAt', width: 20 }
  ];


  dealsSheet.getRow(1).font = { name: 'Arial', family: 4, size: 11, bold: true, color: { argb: 'FFFFFF' } };
  dealsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '4F46E5' }
  };

  deals.forEach(deal => {
    dealsSheet.addRow({
      title: deal.title,
      value: deal.value,
      stage: deal.stage,
      probability: deal.probability,
      owner: deal.owner ? deal.owner.name : 'Unassigned',
      createdAt: new Date(deal.createdAt).toLocaleDateString()
    });
  });


  dealsSheet.getColumn('value').numFmt = '$#,##0.00';
  dealsSheet.getColumn('probability').numFmt = '0"%"';
  dealsSheet.getColumn('value').alignment = { horizontal: 'right' };
  dealsSheet.getColumn('probability').alignment = { horizontal: 'center' };
  dealsSheet.getColumn('stage').alignment = { horizontal: 'center' };


  const accountsSheet = workbook.addWorksheet('Customer Accounts');
  accountsSheet.columns = [
    { header: 'Company Name', key: 'companyName', width: 30 },
    { header: 'Industry', key: 'industry', width: 20 },
    { header: 'Region', key: 'region', width: 20 },
    { header: 'Health Score', key: 'healthScore', width: 15 },
    { header: 'Churn Risk', key: 'churnRisk', width: 15 }
  ];


  accountsSheet.getRow(1).font = { name: 'Arial', family: 4, size: 11, bold: true, color: { argb: 'FFFFFF' } };
  accountsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '0F172A' }
  };

  accounts.forEach(account => {
    accountsSheet.addRow({
      companyName: account.companyName,
      industry: account.industry,
      region: account.region,
      healthScore: account.healthScore,
      churnRisk: account.churnRiskFlag ? 'High Churn Risk' : 'Healthy'
    });
  });

  accountsSheet.getColumn('healthScore').alignment = { horizontal: 'center' };
  accountsSheet.getColumn('churnRisk').alignment = { horizontal: 'center' };


  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

const generateRevenuePDF = async (htmlContent) => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      }
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
};

module.exports = {
  generateRevenueExcel,
  generateRevenuePDF
};
