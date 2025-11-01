const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

/**
 * LocalStorageからアクセストークンを取得
 */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

/**
 * ユーザーアバターをアップロード
 */
export async function uploadUserAvatar(file: Blob): Promise<{ avatar_url: string }> {
  const formData = new FormData();
  formData.append("file", file, "avatar.jpg");

  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/upload/avatar/user`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(error.error || "Failed to upload avatar");
  }

  const data = await response.json();
  return { avatar_url: data.avatar_url };
}

/**
 * エージェントアバターをアップロード
 */
export async function uploadAgentAvatar(
  agentId: string,
  file: Blob
): Promise<{ avatar_url: string }> {
  const formData = new FormData();
  formData.append("file", file, "avatar.jpg");

  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/upload/avatar/agent/${agentId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(error.error || "Failed to upload agent avatar");
  }

  const data = await response.json();
  return { avatar_url: data.avatar_url };
}

