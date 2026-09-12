// Entry points Chromium ships but lib.dom still omits: the directory picker and
// the non-standard permission query on a handle.

export {}

declare global {
  interface FileSystemPermissionDescriptor {
    mode?: 'read' | 'readwrite'
  }

  interface FileSystemHandle {
    queryPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>
    requestPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>
  }

  interface FileSystemDirectoryPickerOptions {
    id?: string
    mode?: 'read' | 'readwrite'
  }

  interface Window {
    showDirectoryPicker(options?: FileSystemDirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
  }
}
