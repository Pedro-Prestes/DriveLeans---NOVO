/**
 * Renova o access token usando refresh token
 */
export async function refreshAccessToken(clientId, clientSecret, refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error_description || "Falha ao renovar token");
  }

  return data.access_token;
}

/**
 * Busca metadados do arquivo (nome, tipo MIME)
 */
export async function getFileMetadata(fileId, accessToken) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Falha ao buscar metadados`);
  }

  return res.json();
}

/**
 * Baixa arquivo do Google Drive (com suporte a chunks para arquivos grandes)
 */
export async function downloadFile(fileId, accessToken, onProgress) {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}`, Range: "bytes=0-0" } }
  );

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Falha ao baixar arquivo`);
  }

  const contentRange = res.headers.get("Content-Range");
  const totalSize = contentRange
    ? parseInt(contentRange.split("/")[1], 10)
    : null;

  if (!totalSize) {
    // Arquivo pequeno, download simples
    const fullRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const buffer = await fullRes.arrayBuffer();
    onProgress?.(buffer.byteLength, buffer.byteLength);
    return buffer;
  }

  // Download por chunks
  const chunks = [];
  let downloaded = 0;

  while (downloaded < totalSize) {
    const end = Math.min(downloaded + CHUNK_SIZE - 1, totalSize - 1);
    const chunkRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Range: `bytes=${downloaded}-${end}`,
        },
      }
    );

    if (!chunkRes.ok && chunkRes.status !== 206) {
      throw new Error(`HTTP ${chunkRes.status}: Falha ao baixar chunk`);
    }

    const chunk = await chunkRes.arrayBuffer();
    chunks.push(chunk);
    downloaded += chunk.byteLength;
    onProgress?.(downloaded, totalSize);
  }

  // Monta buffer final
  const fullBuffer = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    fullBuffer.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }

  return fullBuffer.buffer;
}

/**
 * Obtém credenciais do localStorage
 */
export function getStoredCredentials() {
  const stored = localStorage.getItem("gdrive_credentials");
  return stored ? JSON.parse(stored) : null;
}

/**
 * Remove credenciais do localStorage
 */
export function clearStoredCredentials() {
  localStorage.removeItem("gdrive_credentials");
}