export type BlogContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "image"; alt: string; url: string };

const imageBlockPattern = /^!\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/;
const imagePattern = /!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g;

export function parseBlogContent(content: string): BlogContentBlock[] {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const imageMatch = block.match(imageBlockPattern);

      if (imageMatch) {
        return {
          type: "image",
          alt: imageMatch[1] || "Blog image",
          url: imageMatch[2],
        };
      }

      return { type: "paragraph", text: block };
    });
}

export function getBlogExcerpt(content: string): string {
  return content
    .replace(imagePattern, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function getBlogImageUrls(content: string): string[] {
  return Array.from(content.matchAll(imagePattern), (match) => match[2]);
}
