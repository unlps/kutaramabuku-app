import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, IRunOptions, ImageRun, ISectionOptions } from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

export interface ExportOptions {
  title: string;
  author?: string | null;
  content: string;
  coverElement?: HTMLElement | null;
  hasCoverPage?: boolean;
  coverImage?: string | null;
  genre?: string | null;
}

interface ParsedElement {
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'list-item' | 'ordered-item' | 'image';
  runs: ParsedRun[];
  align?: 'left' | 'center' | 'right' | 'justify';
  listLevel?: number;
  imageSrc?: string;
  imageWidth?: number;
  imageHeight?: number;
}

interface ParsedRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

// Sanitize text to remove HTML tags and normalize whitespace
function sanitizeText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseHtmlContent(html: string): ParsedElement[] {
  const container = document.createElement('div');
  container.innerHTML = html;
  
  const elements: ParsedElement[] = [];
  
  function getAlignment(el: Element): 'left' | 'center' | 'right' | 'justify' | undefined {
    const style = (el as HTMLElement).style?.textAlign;
    const className = el.className || '';
    
    if (style === 'center' || className.includes('text-center')) return 'center';
    if (style === 'right' || className.includes('text-right')) return 'right';
    if (style === 'justify' || className.includes('text-justify')) return 'justify';
    return 'left';
  }
  
  function parseInlineContent(node: Node): ParsedRun[] {
    const runs: ParsedRun[] = [];
    
    function processNode(n: Node, styles: { bold?: boolean; italic?: boolean; underline?: boolean } = {}) {
      if (n.nodeType === Node.TEXT_NODE) {
        const text = n.textContent || '';
        if (text) {
          runs.push({ text, ...styles });
        }
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        const el = n as Element;
        const tagName = el.tagName.toLowerCase();
        
        // Skip image tags in inline content - they're handled separately
        if (tagName === 'img') return;
        
        const newStyles = { ...styles };
        if (tagName === 'strong' || tagName === 'b') newStyles.bold = true;
        if (tagName === 'em' || tagName === 'i') newStyles.italic = true;
        if (tagName === 'u') newStyles.underline = true;
        
        el.childNodes.forEach(child => processNode(child, newStyles));
      }
    }
    
    node.childNodes.forEach(child => processNode(child));
    return runs;
  }
  
  function processElement(el: Element, listLevel = 0) {
    const tagName = el.tagName.toLowerCase();
    
    // Handle images
    if (tagName === 'img') {
      const img = el as HTMLImageElement;
      elements.push({
        type: 'image',
        runs: [],
        imageSrc: img.src,
        imageWidth: img.naturalWidth || img.width || 400,
        imageHeight: img.naturalHeight || img.height || 300,
        align: 'center'
      });
      return;
    }
    
    // Check for images inside element first
    const images = el.querySelectorAll('img');
    
    if (tagName === 'h1') {
      elements.push({
        type: 'heading1',
        runs: parseInlineContent(el),
        align: getAlignment(el)
      });
    } else if (tagName === 'h2') {
      elements.push({
        type: 'heading2',
        runs: parseInlineContent(el),
        align: getAlignment(el)
      });
    } else if (tagName === 'h3') {
      elements.push({
        type: 'heading3',
        runs: parseInlineContent(el),
        align: getAlignment(el)
      });
    } else if (tagName === 'p' || tagName === 'div') {
      // Process images inside paragraphs/divs
      images.forEach(img => {
        elements.push({
          type: 'image',
          runs: [],
          imageSrc: img.src,
          imageWidth: img.naturalWidth || img.width || 400,
          imageHeight: img.naturalHeight || img.height || 300,
          align: getAlignment(el)
        });
      });
      
      const runs = parseInlineContent(el);
      if (runs.length > 0 && runs.some(r => r.text.trim())) {
        elements.push({
          type: 'paragraph',
          runs,
          align: getAlignment(el)
        });
      }
    } else if (tagName === 'ul') {
      el.querySelectorAll(':scope > li').forEach(li => {
        elements.push({
          type: 'list-item',
          runs: parseInlineContent(li),
          listLevel
        });
      });
    } else if (tagName === 'ol') {
      el.querySelectorAll(':scope > li').forEach(li => {
        elements.push({
          type: 'ordered-item',
          runs: parseInlineContent(li),
          listLevel
        });
      });
    } else if (tagName === 'br') {
      elements.push({
        type: 'paragraph',
        runs: [{ text: '' }]
      });
    } else if (tagName === 'figure') {
      // Handle figure elements (common wrapper for images)
      images.forEach(img => {
        elements.push({
          type: 'image',
          runs: [],
          imageSrc: img.src,
          imageWidth: img.naturalWidth || img.width || 400,
          imageHeight: img.naturalHeight || img.height || 300,
          align: 'center'
        });
      });
    } else {
      // Process children for other elements
      el.childNodes.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          processElement(child as Element, listLevel);
        } else if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent?.trim();
          if (text) {
            elements.push({
              type: 'paragraph',
              runs: [{ text }]
            });
          }
        }
      });
    }
  }
  
  container.childNodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      processElement(node as Element);
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        elements.push({
          type: 'paragraph',
          runs: [{ text }]
        });
      }
    }
  });
  
  return elements;
}

function getDocxAlignment(align?: string): typeof AlignmentType[keyof typeof AlignmentType] {
  switch (align) {
    case 'center': return AlignmentType.CENTER;
    case 'right': return AlignmentType.RIGHT;
    case 'justify': return AlignmentType.JUSTIFIED;
    default: return AlignmentType.LEFT;
  }
}

async function waitForImages(element: HTMLElement, timeout = 3000): Promise<void> {
  const images = element.querySelectorAll('img');
  const promises = Array.from(images).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, timeout);
      img.onload = () => { clearTimeout(timer); resolve(); };
      img.onerror = () => { clearTimeout(timer); resolve(); };
    });
  });
  await Promise.all(promises);
}

// Convert image to base64 via canvas (works for CORS-blocked images)
async function imageToBase64ViaCanvas(src: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve({ dataUrl, width: canvas.width, height: canvas.height });
        } else {
          resolve(null);
        }
      } catch (e) {
        console.error('Canvas conversion failed:', e);
        resolve(null);
      }
    };
    
    img.onerror = () => {
      console.error('Image load failed for:', src);
      resolve(null);
    };
    
    // Set timeout to avoid hanging
    setTimeout(() => resolve(null), 10000);
    
    img.src = src;
  });
}

// Fetch image as ArrayBuffer for DOCX
async function fetchImageAsArrayBuffer(src: string): Promise<{ data: ArrayBuffer; width: number; height: number } | null> {
  try {
    // Handle data URLs
    if (src.startsWith('data:')) {
      const base64 = src.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      // Try to get dimensions from a temporary image
      const tempImg = new window.Image();
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        tempImg.onload = () => resolve({ width: tempImg.naturalWidth || 400, height: tempImg.naturalHeight || 300 });
        tempImg.onerror = () => resolve({ width: 400, height: 300 });
        tempImg.src = src;
      });
      return { data: bytes.buffer, ...dimensions };
    }
    
    // Try fetching directly first
    try {
      const response = await fetch(src, { mode: 'cors' });
      if (response.ok) {
        const data = await response.arrayBuffer();
        // Get dimensions
        const tempImg = new window.Image();
        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
          tempImg.onload = () => resolve({ width: tempImg.naturalWidth || 400, height: tempImg.naturalHeight || 300 });
          tempImg.onerror = () => resolve({ width: 400, height: 300 });
          tempImg.src = src;
        });
        return { data, ...dimensions };
      }
    } catch (fetchErr) {
      console.log('Direct fetch failed, trying canvas fallback');
    }
    
    // Fallback: use canvas to convert image (bypasses CORS for display)
    const canvasResult = await imageToBase64ViaCanvas(src);
    if (canvasResult) {
      const base64 = canvasResult.dataUrl.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return { data: bytes.buffer, width: canvasResult.width, height: canvasResult.height };
    }
    
    return null;
  } catch (err) {
    console.error('Error fetching image:', err);
    return null;
  }
}

// Create a programmatic cover page for DOCX when no HTML element is available
async function createDocxCoverSection(options: ExportOptions): Promise<ISectionOptions | null> {
  const { title, author, coverImage, genre } = options;
  
  const children: Paragraph[] = [];
  
  // If there's a cover image, try to use it as the background
  if (coverImage) {
    const imageData = await fetchImageAsArrayBuffer(coverImage);
    if (imageData && imageData.data.byteLength > 0) {
      // Scale image to fit page (8.5in x 11in at 96 DPI = 816 x 1056 pixels)
      const pageWidthPx = 500; // Slightly smaller for margins
      const pageHeightPx = 650;
      
      let widthPx = imageData.width;
      let heightPx = imageData.height;
      
      // Scale to fit
      const scaleW = pageWidthPx / widthPx;
      const scaleH = pageHeightPx / heightPx;
      const scale = Math.min(scaleW, scaleH);
      
      widthPx = Math.round(widthPx * scale);
      heightPx = Math.round(heightPx * scale);
      
      try {
        children.push(new Paragraph({
          spacing: { before: 400, after: 200 }
        }));
        
        children.push(new Paragraph({
          children: [
            new ImageRun({
              data: new Uint8Array(imageData.data),
              transformation: { width: widthPx, height: heightPx },
              type: 'png',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 400 }
        }));
      } catch (imgErr) {
        console.error('Error adding cover image to DOCX:', imgErr);
      }
    }
  }
  
  // Add genre if available
  if (genre) {
    children.push(new Paragraph({
      children: [
        new TextRun({
          text: genre.toUpperCase(),
          size: 20,
          color: '666666',
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 200 }
    }));
  }
  
  // Add title
  children.push(new Paragraph({
    children: [
      new TextRun({
        text: sanitizeText(title),
        bold: true,
        size: 56,
      })
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: coverImage ? 200 : 2400, after: 400 }
  }));
  
  // Add author
  if (author) {
    children.push(new Paragraph({
      children: [
        new TextRun({
          text: `por ${sanitizeText(author)}`,
          italics: true,
          size: 28,
          color: '555555',
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 600 }
    }));
  }
  
  // Add page break
  children.push(new Paragraph({
    children: [new PageBreak()]
  }));
  
  return {
    properties: {
      page: {
        margin: { top: 720, right: 720, bottom: 720, left: 720 }
      }
    },
    children
  };
}

export async function exportToDOCX(options: ExportOptions): Promise<void> {
  const { title, author, content, coverElement, hasCoverPage = true, coverImage, genre } = options;
  
  const parsedContent = parseHtmlContent(content);
  
  const sections: ISectionOptions[] = [];
  
  // Try to add cover as a captured HTML element first
  let coverAdded = false;
  
  if (coverElement && coverElement.offsetWidth > 0 && coverElement.offsetHeight > 0) {
    try {
      await waitForImages(coverElement);
      
      const canvas = await html2canvas(coverElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 5000,
        onclone: (_clonedDoc, clonedElement) => {
          clonedElement.style.width = '8.5in';
          clonedElement.style.height = '11in';
        }
      });
      
      if (canvas.width > 0 && canvas.height > 0) {
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create blob'));
          }, 'image/png', 1.0);
        });
        
        const arrayBuffer = await blob.arrayBuffer();
        
        // Cover section - ImageRun uses pixels for transformation
        // 8.5in x 11in at 96 DPI = 816 x 1056 pixels
        const pageWidthPx = 816;
        const pageHeightPx = 1056;
        
        sections.push({
          properties: {
            page: {
              margin: { top: 0, right: 0, bottom: 0, left: 0 },
              size: {
                width: 12240, // 8.5in in twips
                height: 15840, // 11in in twips
              }
            }
          },
          children: [
            new Paragraph({
              children: [
                new ImageRun({
                  data: new Uint8Array(arrayBuffer),
                  transformation: {
                    width: pageWidthPx,
                    height: pageHeightPx,
                  },
                  type: 'png',
                }),
              ],
              spacing: { before: 0, after: 0, line: 240 }
            }),
          ]
        });
        
        coverAdded = true;
      }
    } catch (err) {
      console.error('Cover capture error for DOCX:', err);
    }
  }
  
  // If no HTML cover was captured but we should have a cover, create one programmatically
  if (!coverAdded && hasCoverPage) {
    const programmaticCover = await createDocxCoverSection({ ...options, coverImage, genre });
    if (programmaticCover) {
      sections.push(programmaticCover);
      coverAdded = true;
    }
  }
  
  // Content section with normal margins
  const contentChildren: Paragraph[] = [];
  
  // Only add title page if no cover was added
  if (!coverAdded) {
    contentChildren.push(new Paragraph({
      children: [
        new TextRun({
          text: sanitizeText(title),
          bold: true,
          size: 48
        })
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 200 }
    }));
    
    if (author) {
      contentChildren.push(new Paragraph({
        children: [new TextRun({ text: `por ${sanitizeText(author)}`, italics: true, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      }));
    }
    
    contentChildren.push(new Paragraph({ children: [new PageBreak()] }));
  }
  
  // Content
  let listCounter = 0;
  
  for (const element of parsedContent) {
    // Handle images
    if (element.type === 'image' && element.imageSrc) {
      const imageResult = await fetchImageAsArrayBuffer(element.imageSrc);
      if (imageResult && imageResult.data.byteLength > 0) {
        // ImageRun uses pixels for transformation
        // Max width 5 inches at 96 DPI = 480 pixels
        const maxWidthPx = 480;
        
        let widthPx = imageResult.width || element.imageWidth || 400;
        let heightPx = imageResult.height || element.imageHeight || 300;
        
        // Scale down if too wide
        if (widthPx > maxWidthPx) {
          const ratio = maxWidthPx / widthPx;
          widthPx = maxWidthPx;
          heightPx = heightPx * ratio;
        }
        
        // Detect image type from data URL or default to png
        let imageType: 'png' | 'jpg' | 'gif' | 'bmp' = 'png';
        if (element.imageSrc.includes('image/jpeg') || element.imageSrc.includes('.jpg') || element.imageSrc.includes('.jpeg')) {
          imageType = 'jpg';
        } else if (element.imageSrc.includes('image/gif') || element.imageSrc.includes('.gif')) {
          imageType = 'gif';
        }
        
        try {
          contentChildren.push(new Paragraph({
            children: [
              new ImageRun({
                data: new Uint8Array(imageResult.data),
                transformation: { width: Math.round(widthPx), height: Math.round(heightPx) },
                type: imageType,
              }),
            ],
            alignment: getDocxAlignment(element.align),
            spacing: { before: 200, after: 200 }
          }));
        } catch (imgErr) {
          console.error('Error adding image to DOCX:', imgErr);
        }
      }
      continue;
    }
    
    const textRuns = element.runs.map(run => {
      const runOptions: IRunOptions = {
        text: run.text,
        bold: run.bold,
        italics: run.italic,
        underline: run.underline ? {} : undefined,
        size: element.type === 'heading1' ? 48 : element.type === 'heading2' ? 36 : element.type === 'heading3' ? 28 : 24
      };
      return new TextRun(runOptions);
    });
    
    if (element.type === 'heading1') {
      contentChildren.push(new Paragraph({
        children: textRuns,
        alignment: getDocxAlignment(element.align),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }));
    } else if (element.type === 'heading2') {
      contentChildren.push(new Paragraph({
        children: textRuns,
        alignment: getDocxAlignment(element.align),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 }
      }));
    } else if (element.type === 'heading3') {
      contentChildren.push(new Paragraph({
        children: textRuns,
        alignment: getDocxAlignment(element.align),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 }
      }));
    } else if (element.type === 'list-item') {
      listCounter = 0;
      contentChildren.push(new Paragraph({
        children: textRuns,
        alignment: getDocxAlignment(element.align),
        bullet: { level: element.listLevel || 0 },
        spacing: { after: 200 }
      }));
    } else if (element.type === 'ordered-item') {
      listCounter++;
      textRuns.unshift(new TextRun({ text: `${listCounter}. `, size: 24 }));
      contentChildren.push(new Paragraph({
        children: textRuns,
        alignment: getDocxAlignment(element.align),
        spacing: { after: 200 }
      }));
    } else {
      contentChildren.push(new Paragraph({
        children: textRuns,
        alignment: getDocxAlignment(element.align),
        spacing: { after: 200 }
      }));
    }
  }
  
  // Add content section with standard margins
  sections.push({
    properties: {
      page: {
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: contentChildren
  });
  
  const doc = new Document({ sections });
  
  const blob = await Packer.toBlob(doc);
  const safeTitle = sanitizeText(title).replace(/[<>:"/\\|?*]/g, '').trim() || 'ebook';
  saveAs(blob, `${safeTitle}.docx`);
}

export async function exportToPDF(options: ExportOptions): Promise<void> {
  const { title, author, content, coverElement, hasCoverPage = true, coverImage, genre } = options;
  
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 72;
  const contentWidth = pageWidth - (margin * 2);
  const lineHeight = 18;
  const maxY = pageHeight - margin;
  
  let hasCover = false;
  
  // Try to add cover from HTML element first
  if (coverElement && coverElement.offsetWidth > 0 && coverElement.offsetHeight > 0) {
    try {
      await waitForImages(coverElement);
      
      const canvas = await html2canvas(coverElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 5000,
        onclone: (_clonedDoc, clonedElement) => {
          clonedElement.style.width = '8.5in';
          clonedElement.style.height = '11in';
        }
      });
      
      if (canvas.width > 0 && canvas.height > 0) {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageWidth, pageHeight);
        hasCover = true;
        pdf.addPage();
      }
    } catch (err) {
      console.error('Cover capture error:', err);
    }
  }
  
  // If no HTML cover was captured but we should have a cover, create one programmatically
  if (!hasCover && hasCoverPage) {
    let yPos = 100;
    
    // Add cover image if available
    if (coverImage) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Cover image load failed'));
          setTimeout(() => reject(new Error('Timeout')), 5000);
          img.src = coverImage;
        });
        
        // Calculate dimensions to fit on page (leaving space for title)
        let imgWidth = img.naturalWidth || img.width;
        let imgHeight = img.naturalHeight || img.height;
        const maxImgWidth = contentWidth;
        const maxImgHeight = pageHeight * 0.5; // Use half the page for image
        
        const scaleW = maxImgWidth / imgWidth;
        const scaleH = maxImgHeight / imgHeight;
        const scale = Math.min(scaleW, scaleH, 1);
        
        imgWidth = imgWidth * scale;
        imgHeight = imgHeight * scale;
        
        const imgX = (pageWidth - imgWidth) / 2;
        
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', imgX, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 40;
        }
      } catch (err) {
        console.error('Cover image error:', err);
        yPos = margin + 150;
      }
    } else {
      yPos = margin + 150;
    }
    
    // Add genre if available
    if (genre) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(genre.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
      yPos += 40;
    }
    
    // Add title
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    const titleLines = pdf.splitTextToSize(sanitizeText(title), contentWidth);
    pdf.text(titleLines, pageWidth / 2, yPos, { align: 'center' });
    yPos += titleLines.length * 35 + 30;
    
    // Add author
    if (author) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(80, 80, 80);
      pdf.text(`por ${sanitizeText(author)}`, pageWidth / 2, yPos, { align: 'center' });
    }
    
    hasCover = true;
    pdf.addPage();
  }
  
  // Reset text color for content
  pdf.setTextColor(0, 0, 0);
  
  let yPos = margin;
  
  // If no cover at all, add title page
  if (!hasCover) {
    yPos = margin + 150;
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    const titleLines = pdf.splitTextToSize(sanitizeText(title), contentWidth);
    pdf.text(titleLines, pageWidth / 2, yPos, { align: 'center' });
    yPos += titleLines.length * 35 + 50;
    
    if (author) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`por ${sanitizeText(author)}`, pageWidth / 2, yPos, { align: 'center' });
    }
    
    pdf.addPage();
    yPos = margin;
  }
  
  const parsedContent = parseHtmlContent(content);
  let listCounter = 0;
  
  for (const element of parsedContent) {
    if (yPos > maxY - 40) {
      pdf.addPage();
      yPos = margin;
    }
    
    // Handle images in PDF
    if (element.type === 'image' && element.imageSrc) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = element.imageSrc!;
        });
        
        // Calculate dimensions to fit within page
        let imgWidth = element.imageWidth || img.width || 400;
        let imgHeight = element.imageHeight || img.height || 300;
        const maxImgWidth = contentWidth;
        const maxImgHeight = maxY - yPos - 40;
        
        // Scale to fit width
        if (imgWidth > maxImgWidth) {
          const ratio = maxImgWidth / imgWidth;
          imgWidth = maxImgWidth;
          imgHeight = imgHeight * ratio;
        }
        
        // Scale to fit height if needed
        if (imgHeight > maxImgHeight && maxImgHeight > 100) {
          const ratio = maxImgHeight / imgHeight;
          imgHeight = maxImgHeight;
          imgWidth = imgWidth * ratio;
        }
        
        // If image is too tall for remaining space, start new page
        if (imgHeight > maxY - yPos - 20) {
          pdf.addPage();
          yPos = margin;
        }
        
        // Center the image
        const imgX = margin + (contentWidth - imgWidth) / 2;
        
        // Create canvas to convert image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', imgX, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 20;
        }
      } catch (err) {
        console.error('Error adding image to PDF:', err);
      }
      continue;
    }
    
    // Set font based on element type
    let fontSize = 12;
    let spacingBefore = 0;
    let spacingAfter = 8;
    
    if (element.type === 'heading1') {
      fontSize = 24;
      spacingBefore = 20;
      spacingAfter = 12;
    } else if (element.type === 'heading2') {
      fontSize = 18;
      spacingBefore = 16;
      spacingAfter = 10;
    } else if (element.type === 'heading3') {
      fontSize = 14;
      spacingBefore = 12;
      spacingAfter = 8;
    } else if (element.type === 'list-item') {
      listCounter = 0;
    } else if (element.type === 'ordered-item') {
      listCounter++;
    }
    
    yPos += spacingBefore;
    
    // Build text content with proper inline styling
    let xPos = margin;
    
    if (element.type === 'list-item') {
      xPos = margin + 20;
    } else if (element.type === 'ordered-item') {
      xPos = margin + 20;
    }
    
    // Get alignment
    let align: 'left' | 'center' | 'right' = 'left';
    if (element.align === 'center') align = 'center';
    else if (element.align === 'right') align = 'right';
    
    let textX = xPos;
    if (align === 'center') textX = pageWidth / 2;
    else if (align === 'right') textX = pageWidth - margin;
    
    const effectiveWidth = element.type.includes('item') ? contentWidth - 20 : contentWidth;
    
    // Process runs individually for proper formatting
    // jsPDF doesn't support mixed inline styles well, so we render each run
    // For headings, always use bold
    const isHeading = element.type.startsWith('heading');
    
    // Build complete text for line wrapping
    let prefix = '';
    if (element.type === 'list-item') prefix = '• ';
    else if (element.type === 'ordered-item') prefix = `${listCounter}. `;
    
    const fullText = prefix + element.runs.map(r => r.text).join('');
    
    if (!fullText.trim()) {
      yPos += lineHeight;
      continue;
    }
    
    pdf.setFontSize(fontSize);
    
    // Determine font style - only apply bold for headings, otherwise use run styles
    if (isHeading) {
      pdf.setFont('helvetica', 'bold');
    } else {
      // For non-headings, check if ALL runs are bold (not just some)
      const allBold = element.runs.length > 0 && element.runs.every(r => r.bold);
      const allItalic = element.runs.length > 0 && element.runs.every(r => r.italic);
      
      if (allBold && allItalic) {
        pdf.setFont('helvetica', 'bolditalic');
      } else if (allBold) {
        pdf.setFont('helvetica', 'bold');
      } else if (allItalic) {
        pdf.setFont('helvetica', 'italic');
      } else {
        pdf.setFont('helvetica', 'normal');
      }
    }
    
    const lines = pdf.splitTextToSize(fullText, effectiveWidth);
    
    for (const line of lines) {
      if (yPos > maxY) {
        pdf.addPage();
        yPos = margin;
      }
      
      pdf.text(line, textX, yPos, { align });
      yPos += lineHeight;
    }
    
    yPos += spacingAfter;
  }
  
  const safeTitle = sanitizeText(title).replace(/[<>:"/\\|?*]/g, '').trim() || 'ebook';
  pdf.save(`${safeTitle}.pdf`);
}
