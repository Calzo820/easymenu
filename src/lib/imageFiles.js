const MAX_FILE_SIZE = 8 * 1024 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Impossibile leggere l'immagine selezionata."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Formato immagine non valido."));
    image.src = src;
  });
}

export async function imageFileToDataUrl(file, options = {}) {
  if (!file) return "";
  if (!String(file.type || "").startsWith("image/")) {
    throw new Error("Seleziona un file immagine valido.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Immagine troppo pesante. Usa un file sotto 8 MB.");
  }

  const {
    maxWidth = 1400,
    maxHeight = 1000,
    quality = 0.82,
  } = options;

  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const ratio = Math.min(1, maxWidth / image.width, maxHeight / image.height);
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}
