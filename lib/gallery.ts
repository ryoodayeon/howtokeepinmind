// Browser-tab memory only: selected files survive an App remount during navigation.
let pending: File[] = [];
export function queueGalleryFiles(files: File[]) { pending = files; }
export function takeGalleryFiles(): File[] { const files = pending; pending = []; return files; }
