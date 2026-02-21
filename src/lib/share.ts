/**
 * Share via Web Share API, falling back to clipboard copy.
 * Returns true if the content was shared or copied successfully.
 */
export async function shareOrCopy(
  shareData: { title: string; text: string; url: string },
  onCopied?: () => void,
): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch {
      /* user cancelled or API unavailable */
    }
  }
  try {
    await navigator.clipboard.writeText(shareData.url);
  } catch {
    // Fallback for older browsers / insecure contexts
    const el = document.createElement('textarea');
    el.value = shareData.url;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
  onCopied?.();
}
