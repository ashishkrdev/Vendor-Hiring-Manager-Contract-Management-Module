import { Readable } from "stream";
import zlib from "zlib";
import { createStorageService } from "../storage/storageFactory.js";
import { sanitizeResumeText } from "./sanitizer.js";

// Helper to convert stream to buffer
export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Extracts raw text from PPTX files by inspecting zip entries and parsing slide xml.
 */
function extractTextFromPptxBuffer(buffer: Buffer): string {
  try {
    let textParts: string[] = [];
    let offset = 0;

    // Search for ZIP Local File Headers: 0x04034b50 ("PK\x03\x04")
    while (offset < buffer.length - 30) {
      if (
        buffer[offset] === 0x50 &&
        buffer[offset + 1] === 0x4b &&
        buffer[offset + 2] === 0x03 &&
        buffer[offset + 3] === 0x04
      ) {
        const compressionMethod = buffer.readUInt16LE(offset + 8);
        const compressedSize = buffer.readUInt32LE(offset + 18);
        const fileNameLength = buffer.readUInt16LE(offset + 26);
        const extraFieldLength = buffer.readUInt16LE(offset + 28);

        const fileNameStart = offset + 30;
        const fileNameEnd = fileNameStart + fileNameLength;
        const fileName = buffer.toString("utf8", fileNameStart, fileNameEnd);

        const dataStart = fileNameEnd + extraFieldLength;
        const dataEnd = dataStart + compressedSize;

        if (fileName.startsWith("ppt/slides/slide") && fileName.endsWith(".xml")) {
          const compressedData = buffer.slice(dataStart, dataEnd);
          let xmlContent = "";
          if (compressionMethod === 8) {
            // Deflated
            try {
              const decompressed = zlib.inflateRawSync(compressedData);
              xmlContent = decompressed.toString("utf8");
            } catch {
              // Ignore single slide decompression error
            }
          } else if (compressionMethod === 0) {
            // Stored
            xmlContent = compressedData.toString("utf8");
          }

          if (xmlContent) {
            // Extract text from <a:t>...</a:t> elements
            const matches = xmlContent.match(/<a:t[^>]*>(.*?)<\/a:t>/gi);
            if (matches) {
              const slideText = matches
                .map((m) => m.replace(/<[^>]+>/g, ""))
                .join(" ");
              textParts.push(slideText);
            }
          }
        }

        offset = dataEnd;
      } else {
        offset++;
      }
    }

    return textParts.join("\n");
  } catch (error) {
    console.error("[fileParser] Error extracting PPTX:", error);
    return "";
  }
}

/**
 * Downloads a file from S3 using its key and parses its text content.
 */
export async function parseResumeFromS3(s3Key: string): Promise<string> {
  const storageService = createStorageService();
  const stream = await storageService.getObjectStream(s3Key);
  const buffer = await streamToBuffer(stream);

  return parseResumeBuffer(buffer, s3Key);
}

/**
 * Parses text from a resume buffer (PDF or PPTX).
 */
export async function parseResumeBuffer(buffer: Buffer, filenameOrKey: string): Promise<string> {
  const lower = filenameOrKey.toLowerCase();
  let extractedText = "";

  if (lower.endsWith(".pdf")) {
    try {
      // Dynamic import pdf-extraction
      const pdfParse = (await import("pdf-extraction")).default || (await import("pdf-extraction"));
      const pdfData = await (pdfParse as any)(buffer);
      extractedText = pdfData.text || "";
    } catch (err) {
      console.error("[fileParser] PDF parsing failed, trying text extraction fallback:", err);
      extractedText = buffer.toString("utf8").replace(/[^\x20-\x7E\n]/g, " ");
    }
  } else if (lower.endsWith(".pptx")) {
    extractedText = extractTextFromPptxBuffer(buffer);
  } else {
    // Default utf-8 fallback
    extractedText = buffer.toString("utf8");
  }

  return sanitizeResumeText(extractedText);
}
