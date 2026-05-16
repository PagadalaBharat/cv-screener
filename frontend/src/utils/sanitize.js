export const sanitizeCV = (text) => {
  let c = text
  c = c.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi, '[Email Removed]')
  c = c.replace(/(\+?\d{1,3}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}/gi, '[Phone Removed]')
  c = c.replace(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+\/?/gi, '[LinkedIn Removed]')
  c = c.replace(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9\-_%]+\/?/gi, '[GitHub Removed]')
  c = c.replace(/https?:\/\/[^\s]+/gi, '[URL Removed]')
  c = c.replace(/\b\d{5,6}\b/g, '[PIN Removed]')
  c = c.replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[ID Removed]')
  c = c.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, '[PAN Removed]')
  c = c.replace(/[ \t]{2,}/g, ' ')
  c = c.replace(/\n{3,}/g, '\n\n')
  return c.trim()
}

export const extractTextFromFile = async (file) => {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'txt') {
    return await file.text()
  }

  if (ext === 'pdf') {
    const arrayBuffer = await file.arrayBuffer()
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let text = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += content.items.map(item => item.str).join(' ') + '\n\n'
    }
    return text
  }

  if (ext === 'docx') {
    const arrayBuffer = await file.arrayBuffer()
    const mammoth     = await import('mammoth')
    const result      = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  throw new Error('Unsupported file type. Please use PDF, DOCX or TXT.')
}