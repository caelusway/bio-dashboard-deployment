import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';

interface ReportMetadata {
  reportType: string;
  channelName: string;
  channelCategory?: string;
  daoName?: string;
  periodStart: string;
  periodEnd: string;
  stats?: {
    totalMessages: number;
    uniqueAuthors: number;
    averageMessagesPerDay: number;
  };
  analysis?: {
    sentiment: string;
    engagementLevel: string;
  };
}

/**
 * Export Discord report to PDF
 */
export async function exportReportToPDF(
  content: string,
  metadata: ReportMetadata
): Promise<void> {
  try {
    // Create a temporary container for rendering
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm'; // A4 width
    container.style.padding = '20mm';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#000000';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '12px';
    container.style.lineHeight = '1.6';
    
    // Build PDF content
    const pdfContent = buildPDFContent(content, metadata);
    container.innerHTML = pdfContent;
    
    document.body.appendChild(container);
    
    // Generate canvas from HTML
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    
    // Remove temporary container
    document.body.removeChild(container);
    
    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // Generate filename
    const filename = generateFilename(metadata);
    
    // Save PDF
    pdf.save(filename);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}

/**
 * Build HTML content for PDF
 */
function buildPDFContent(content: string, metadata: ReportMetadata): string {
  
  // Format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  // Build header
  const header = `
    <div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
        <span style="background: #3b82f6; color: white; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600;">
          📝 ${metadata.reportType.toUpperCase()} REPORT
        </span>
        ${metadata.daoName ? `
          <span style="background: #f3f4f6; color: #374151; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 500;">
            ${metadata.daoName}
          </span>
        ` : ''}
      </div>
      
      <h1 style="margin: 0 0 15px 0; font-size: 24px; font-weight: 700; color: #111827;">
        ${metadata.channelCategory ? `${metadata.channelCategory} / ` : ''}${metadata.channelName}
      </h1>
      
      <div style="display: flex; flex-wrap: wrap; gap: 15px; font-size: 11px; color: #6b7280;">
        <div style="display: flex; align-items: center; gap: 5px;">
          <span>📅</span>
          <span>${formatDate(metadata.periodStart)} - ${formatDate(metadata.periodEnd)}</span>
        </div>
        
        ${metadata.stats ? `
          <div style="display: flex; align-items: center; gap: 5px;">
            <span>💬</span>
            <span>${metadata.stats.totalMessages} messages</span>
          </div>
          
          <div style="display: flex; align-items: center; gap: 5px;">
            <span>👥</span>
            <span>${metadata.stats.uniqueAuthors} contributors</span>
          </div>
        ` : ''}
        
        ${metadata.analysis ? `
          <div style="display: flex; align-items: center; gap: 5px;">
            <span>${getSentimentEmoji(metadata.analysis.sentiment)}</span>
            <span>${metadata.analysis.sentiment.toUpperCase()}</span>
          </div>
          
          <div style="display: flex; align-items: center; gap: 5px;">
            <span>${getEngagementEmoji(metadata.analysis.engagementLevel)}</span>
            <span>${metadata.analysis.engagementLevel.toUpperCase()}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  // Convert markdown to HTML
  const htmlContent = marked.parse(content);
  
  // Style the content
  const styledContent = `
    <style>
      h2 {
        font-size: 18px;
        font-weight: 700;
        color: #111827;
        margin: 25px 0 15px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      h3 {
        font-size: 15px;
        font-weight: 600;
        color: #374151;
        margin: 20px 0 10px 0;
      }
      
      p {
        margin: 10px 0;
        color: #374151;
      }
      
      ul, ol {
        margin: 10px 0;
        padding-left: 25px;
      }
      
      li {
        margin: 5px 0;
        color: #374151;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
      }
      
      th {
        background: #f3f4f6;
        padding: 10px;
        text-align: left;
        font-weight: 600;
        border: 1px solid #e5e7eb;
      }
      
      td {
        padding: 10px;
        border: 1px solid #e5e7eb;
      }
      
      blockquote {
        border-left: 4px solid #3b82f6;
        padding-left: 15px;
        margin: 15px 0;
        color: #6b7280;
        font-style: italic;
      }
      
      code {
        background: #f3f4f6;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: monospace;
        font-size: 11px;
      }
      
      hr {
        border: none;
        border-top: 1px solid #e5e7eb;
        margin: 20px 0;
      }
      
      strong {
        font-weight: 600;
        color: #111827;
      }
      
      em {
        font-style: italic;
        color: #6b7280;
      }
    </style>
    
    ${header}
    ${htmlContent}
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #9ca3af;">
      <p>🤖 This report was automatically generated by BioSyncAgent - AI Project Intelligence for Bio Ecosystem</p>
      <p>Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
    </div>
  `;
  
  return styledContent;
}

/**
 * Generate filename for PDF
 */
function generateFilename(metadata: ReportMetadata): string {
  const date = new Date().toISOString().split('T')[0];
  const channelName = metadata.channelName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const reportType = metadata.reportType.toLowerCase();
  
  return `${metadata.daoName || 'discord'}-${channelName}-${reportType}-report-${date}.pdf`;
}

/**
 * Get sentiment emoji
 */
function getSentimentEmoji(sentiment: string): string {
  switch (sentiment.toLowerCase()) {
    case 'positive':
      return '🟢';
    case 'negative':
      return '🔴';
    default:
      return '🟡';
  }
}

/**
 * Get engagement emoji
 */
function getEngagementEmoji(engagement: string): string {
  switch (engagement.toLowerCase()) {
    case 'high':
      return '🔥';
    case 'low':
      return '❄️';
    default:
      return '⚡';
  }
}

