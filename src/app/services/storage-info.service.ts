import { Injectable } from '@angular/core'
import { BrainyData } from '@soulcraft/brainy'

// Extended Performance interface to include Chrome's memory property
interface PerformanceWithMemory extends Performance {
  memory: {
    usedJSHeapSize: number
    jsHeapSizeLimit: number
    totalJSHeapSize: number
  }
}

export interface StorageInfo {
  used: number
  available: number | null
  total: number | null
  percentage: number | null
}

@Injectable({
  providedIn: 'root'
})
export class StorageInfoService {
  private brainyService = new BrainyData()

  constructor() {}

  /**
   * Get filesystem storage information
   * @returns Promise with storage information
   */
  async getFilesystemInfo(): Promise<StorageInfo> {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate()
        const used = estimate.usage || 0
        const total = estimate.quota || null
        const available = total !== null ? total - used : null
        const percentage = total !== null ? (used / total) * 100 : null

        return {
          used,
          available,
          total,
          percentage
        }
      }
    } catch (error) {
      console.error('Error getting filesystem storage info:', error)
    }

    return {
      used: 0,
      available: null,
      total: null,
      percentage: null
    }
  }

  /**
   * Get OPFS (Origin Private File System) storage information
   * @returns Promise with storage information
   */
  async getOPFSInfo(): Promise<StorageInfo> {
    try {
      const status = await this.brainyService.status()
      const used = status.used || 0
      const total = status.quota || null
      const available = total !== null ? total - used : null
      const percentage = total !== null ? (used / total) * 100 : null

      return {
        used,
        available,
        total,
        percentage
      }
    } catch (error) {
      console.error('Error getting OPFS storage info:', error)
      return {
        used: 0,
        available: null,
        total: null,
        percentage: null
      }
    }
  }

  /**
   * Get memory usage information
   * @returns Promise with storage information
   */
  async getMemoryInfo(): Promise<StorageInfo> {
    try {
      // Check if performance exists and cast to our extended interface
      const perf = window.performance as unknown as PerformanceWithMemory

      // Check if memory property exists (Chrome-specific)
      if (perf && 'memory' in perf) {
        const memory = perf.memory
        const used = memory.usedJSHeapSize || 0
        const total = memory.jsHeapSizeLimit || null
        const available = total !== null ? total - used : null
        const percentage = total !== null ? (used / total) * 100 : null

        return {
          used,
          available,
          total,
          percentage
        }
      }
    } catch (error) {
      console.error('Error getting memory info:', error)
    }

    return {
      used: 0,
      available: null,
      total: null,
      percentage: null
    }
  }

  /**
   * Format bytes to a human-readable string
   * @param bytes Number of bytes
   * @param decimals Number of decimal places
   * @returns Formatted string
   */
  formatBytes(bytes: number | null, decimals = 2): string {
    if (bytes === null || bytes === 0) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }
}
