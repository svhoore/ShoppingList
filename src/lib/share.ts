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
    // Clipboard API unavailable — silently fail
  }
  onCopied?.();
}
