
export const parsePdf = async (file: File): Promise<string> => {
  const pdfjsLib = (window as any).pdfjsLib;

  if (!pdfjsLib) {
    throw new Error("PDF processing library failed to load. Please check your internet connection and refresh the page.");
  }
  
  // Set the worker source to a specific, known-good version that matches the one in index.html.
  // This is more robust than relying on a dynamic version property.
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (!event.target?.result) {
        return reject(new Error("Failed to read the file's contents."));
      }
      try {
        const pdf = await pdfjsLib.getDocument({ data: event.target.result }).promise;
        let textContent = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          // The item.str is the text content. Join with spaces. Add newline for each page.
          textContent += text.items.map((s: { str: string }) => s.str).join(' ') + '\n';
        }
        resolve(textContent);
      } catch (error) {
        console.error("Error parsing PDF:", error);
        reject(new Error("Could not parse the PDF file. It may be corrupt or encrypted."));
      }
    };
    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      reject(new Error("An error occurred while reading the file."));
    };
    reader.readAsArrayBuffer(file);
  });
};

export const parseDocx = async (file: File): Promise<string> => {
  // Access the library from the global window object when it's needed
  const mammoth = (window as any).mammoth;

  if (!mammoth) {
    throw new Error("Word document processing library failed to load. Please check your internet connection and refresh the page.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (!event.target?.result) {
        return reject(new Error("Failed to read the file's contents."));
      }
      try {
        const result = await mammoth.extractRawText({ arrayBuffer: event.target.result });
        resolve(result.value);
      } catch (error) {
        console.error("Error parsing DOCX:", error);
        reject(new Error("Could not parse the DOCX file. It may be corrupt or not a valid .docx file."));
      }
    };
    reader.onerror = (error) => {
        console.error("FileReader error:", error);
        reject(new Error("An error occurred while reading the file."));
    };
    reader.readAsArrayBuffer(file);
  });
};