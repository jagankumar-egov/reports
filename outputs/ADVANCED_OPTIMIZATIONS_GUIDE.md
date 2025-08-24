# Advanced Optimizations Guide (Week 7-8)
## Campaign Module Performance Enhancement

This guide details the implementation of advanced optimization techniques for the Campaign Module, building on the lazy loading foundation established in previous phases.

---

## 🧵 1. Web Workers for Heavy Processing

### **Objective:**
Move CPU-intensive tasks off the main thread to prevent UI blocking, particularly for Excel processing and data transformations.

### **Implementation Strategy:**

#### **1.1 Excel Processing Web Worker**

**Step 1: Create Excel Worker**
```javascript
// src/workers/excel-processor.worker.js
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

class ExcelProcessor {
  static async processFile(arrayBuffer, options = {}) {
    const startTime = performance.now();
    
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const results = [];
      
      workbook.eachSheet((worksheet) => {
        const data = [];
        worksheet.eachRow((row, rowNumber) => {
          const rowData = [];
          row.eachCell((cell) => {
            rowData.push(cell.value);
          });
          data.push(rowData);
        });
        
        results.push({
          name: worksheet.name,
          data,
          rowCount: data.length,
        });
      });
      
      const processingTime = performance.now() - startTime;
      
      return {
        success: true,
        data: results,
        processingTime,
        fileSize: arrayBuffer.byteLength,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        processingTime: performance.now() - startTime,
      };
    }
  }
  
  static async validateData(data, validationRules) {
    const errors = [];
    const warnings = [];
    
    data.forEach((row, rowIndex) => {
      validationRules.forEach((rule) => {
        const cellValue = row[rule.columnIndex];
        
        if (rule.required && !cellValue) {
          errors.push({
            row: rowIndex + 1,
            column: rule.columnIndex,
            message: `Required field is empty`,
            type: 'required',
          });
        }
        
        if (rule.pattern && cellValue && !rule.pattern.test(cellValue)) {
          warnings.push({
            row: rowIndex + 1,
            column: rule.columnIndex,
            message: `Value doesn't match expected pattern`,
            type: 'pattern',
          });
        }
      });
    });
    
    return { errors, warnings };
  }
  
  static async transformData(data, transformConfig) {
    return data.map((row) => {
      const transformedRow = { ...row };
      
      transformConfig.forEach(({ from, to, transformer }) => {
        if (transformedRow[from]) {
          transformedRow[to] = transformer(transformedRow[from]);
          if (from !== to) delete transformedRow[from];
        }
      });
      
      return transformedRow;
    });
  }
}

// Web Worker message handler
self.onmessage = async function(e) {
  const { type, payload, id } = e.data;
  
  try {
    let result;
    
    switch (type) {
      case 'PROCESS_FILE':
        result = await ExcelProcessor.processFile(payload.arrayBuffer, payload.options);
        break;
        
      case 'VALIDATE_DATA':
        result = await ExcelProcessor.validateData(payload.data, payload.rules);
        break;
        
      case 'TRANSFORM_DATA':
        result = await ExcelProcessor.transformData(payload.data, payload.config);
        break;
        
      default:
        throw new Error(`Unknown worker action: ${type}`);
    }
    
    self.postMessage({
      id,
      type: `${type}_SUCCESS`,
      payload: result,
    });
    
  } catch (error) {
    self.postMessage({
      id,
      type: `${type}_ERROR`,
      payload: {
        error: error.message,
        stack: error.stack,
      },
    });
  }
};
```

**Step 2: Web Worker Manager**
```javascript
// src/utils/workerManager.js
class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.taskQueue = [];
    this.activeRequests = new Map();
  }
  
  createWorker(name, scriptPath) {
    if (!this.workers.has(name)) {
      const worker = new Worker(scriptPath);
      this.workers.set(name, worker);
      
      worker.onmessage = (e) => {
        const { id, type, payload } = e.data;
        const request = this.activeRequests.get(id);
        
        if (request) {
          if (type.endsWith('_SUCCESS')) {
            request.resolve(payload);
          } else if (type.endsWith('_ERROR')) {
            request.reject(new Error(payload.error));
          }
          
          this.activeRequests.delete(id);
        }
      };
      
      worker.onerror = (error) => {
        console.error(`Worker ${name} error:`, error);
      };
    }
    
    return this.workers.get(name);
  }
  
  async executeTask(workerName, type, payload) {
    const worker = this.workers.get(workerName);
    if (!worker) {
      throw new Error(`Worker ${workerName} not found`);
    }
    
    const id = Date.now() + Math.random();
    
    return new Promise((resolve, reject) => {
      this.activeRequests.set(id, { resolve, reject });
      
      worker.postMessage({
        id,
        type,
        payload,
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.activeRequests.has(id)) {
          this.activeRequests.delete(id);
          reject(new Error('Worker task timeout'));
        }
      }, 30000);
    });
  }
  
  terminateWorker(name) {
    const worker = this.workers.get(name);
    if (worker) {
      worker.terminate();
      this.workers.delete(name);
    }
  }
  
  terminateAll() {
    this.workers.forEach((worker, name) => {
      worker.terminate();
    });
    this.workers.clear();
    this.activeRequests.clear();
  }
}

export const workerManager = new WorkerManager();

// Initialize Excel worker
workerManager.createWorker('excel', '/workers/excel-processor.worker.js');
```

**Step 3: Excel Component Integration**
```javascript
// Update UploadData.js to use Web Worker
import { workerManager } from '../utils/workerManager';

const useExcelProcessor = () => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const processExcelFile = async (file, validationRules = []) => {
    setProcessing(true);
    setProgress(0);
    
    try {
      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      setProgress(25);
      
      // Process file in Web Worker
      const processResult = await workerManager.executeTask('excel', 'PROCESS_FILE', {
        arrayBuffer,
        options: { includeMetadata: true }
      });
      
      setProgress(50);
      
      if (!processResult.success) {
        throw new Error(processResult.error);
      }
      
      // Validate data in Web Worker
      const validationResult = await workerManager.executeTask('excel', 'VALIDATE_DATA', {
        data: processResult.data[0].data, // First sheet
        rules: validationRules
      });
      
      setProgress(75);
      
      const result = {
        ...processResult,
        validation: validationResult,
      };
      
      setProgress(100);
      setTimeout(() => setProcessing(false), 500);
      
      return result;
      
    } catch (error) {
      setProcessing(false);
      throw error;
    }
  };
  
  return {
    processExcelFile,
    processing,
    progress,
  };
};
```

---

## 🗂️ 2. Service Worker Caching

### **Objective:**
Implement intelligent caching strategies for components, API responses, and static assets to improve load times and enable offline functionality.

### **Implementation Strategy:**

#### **2.1 Service Worker Setup**

**Step 1: Create Service Worker**
```javascript
// public/sw.js
const CACHE_NAME = 'campaign-module-v1';
const STATIC_CACHE = 'campaign-static-v1';
const DYNAMIC_CACHE = 'campaign-dynamic-v1';
const API_CACHE = 'campaign-api-v1';

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only',
};

// Resource patterns and their strategies
const CACHING_RULES = [
  {
    pattern: /\.(js|css|woff2?|png|jpg|jpeg|svg|ico)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: STATIC_CACHE,
    maxEntries: 100,
    maxAgeSeconds: 86400 * 30, // 30 days
  },
  {
    pattern: /\/api\/campaign\//,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cacheName: API_CACHE,
    maxEntries: 50,
    maxAgeSeconds: 86400, // 1 day
  },
  {
    pattern: /\/components\/.*\.js$/,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cacheName: DYNAMIC_CACHE,
    maxEntries: 200,
    maxAgeSeconds: 86400 * 7, // 7 days
  },
];

class CacheManager {
  static async handleFetch(request) {
    const url = new URL(request.url);
    const rule = this.findMatchingRule(url);
    
    if (!rule) {
      return fetch(request);
    }
    
    switch (rule.strategy) {
      case CACHE_STRATEGIES.CACHE_FIRST:
        return this.cacheFirst(request, rule);
      case CACHE_STRATEGIES.NETWORK_FIRST:
        return this.networkFirst(request, rule);
      case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
        return this.staleWhileRevalidate(request, rule);
      default:
        return fetch(request);
    }
  }
  
  static findMatchingRule(url) {
    return CACHING_RULES.find(rule => 
      rule.pattern.test(url.pathname) || rule.pattern.test(url.href)
    );
  }
  
  static async cacheFirst(request, rule) {
    const cache = await caches.open(rule.cacheName);
    const cached = await cache.match(request);
    
    if (cached && !this.isExpired(cached, rule.maxAgeSeconds)) {
      return cached;
    }
    
    try {
      const response = await fetch(request);
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return cached || new Response('Offline', { status: 503 });
    }
  }
  
  static async networkFirst(request, rule) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(rule.cacheName);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cache = await caches.open(rule.cacheName);
      const cached = await cache.match(request);
      return cached || new Response('Offline', { status: 503 });
    }
  }
  
  static async staleWhileRevalidate(request, rule) {
    const cache = await caches.open(rule.cacheName);
    const cached = await cache.match(request);
    
    // Always try to update in background
    const updateCache = async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
        }
      } catch (error) {
        console.log('Background update failed:', error);
      }
    };
    
    if (cached) {
      updateCache(); // Background update
      return cached;
    } else {
      return fetch(request).then(response => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      });
    }
  }
  
  static isExpired(response, maxAgeSeconds) {
    const date = new Date(response.headers.get('date'));
    const now = new Date();
    const age = (now.getTime() - date.getTime()) / 1000;
    return age > maxAgeSeconds;
  }
  
  static async cleanupExpiredCaches() {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        const rule = CACHING_RULES.find(r => r.cacheName === cacheName);
        
        if (rule && this.isExpired(response, rule.maxAgeSeconds)) {
          await cache.delete(request);
        }
      }
    }
  }
}

// Service Worker event listeners
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/static/js/bundle.js',
        '/static/css/main.css',
        '/manifest.json',
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => !cacheName.startsWith('campaign-'))
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(CacheManager.handleFetch(event.request));
});

// Cleanup expired caches periodically
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEANUP_CACHES') {
    event.waitUntil(CacheManager.cleanupExpiredCaches());
  }
});
```

**Step 2: Service Worker Registration**
```javascript
// src/utils/serviceWorkerManager.js
class ServiceWorkerManager {
  static async register() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        console.log('✅ Service Worker registered:', registration);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 New content available, refresh to update');
              this.notifyUpdate();
            }
          });
        });
        
        // Cleanup expired caches periodically
        setInterval(() => {
          navigator.serviceWorker.controller?.postMessage({
            type: 'CLEANUP_CACHES'
          });
        }, 86400000); // Every 24 hours
        
        return registration;
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }
  }
  
  static notifyUpdate() {
    if (window.confirm('New version available. Refresh to update?')) {
      window.location.reload();
    }
  }
  
  static async unregister() {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        registration.unregister();
      }
    }
  }
}

// Auto-register on load
if (process.env.NODE_ENV === 'production') {
  ServiceWorkerManager.register();
}

export default ServiceWorkerManager;
```

---

## 📈 3. Progressive Enhancement

### **Objective:**
Implement adaptive loading based on device capabilities, network conditions, and user preferences.

### **Implementation Strategy:**

#### **3.1 Adaptive Loading System**

**Step 1: Device Capability Detection**
```javascript
// src/utils/deviceCapabilities.js
class DeviceCapabilities {
  static getCapabilities() {
    const capabilities = {
      memory: this.getMemoryInfo(),
      network: this.getNetworkInfo(),
      cpu: this.getCPUInfo(),
      storage: this.getStorageInfo(),
      features: this.getFeatureSupport(),
    };
    
    return {
      ...capabilities,
      tier: this.calculateDeviceTier(capabilities),
    };
  }
  
  static getMemoryInfo() {
    if ('memory' in navigator) {
      return {
        deviceMemory: navigator.deviceMemory,
        usedJSHeapSize: performance.memory?.usedJSHeapSize || 0,
        totalJSHeapSize: performance.memory?.totalJSHeapSize || 0,
        jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit || 0,
      };
    }
    return { deviceMemory: 4 }; // Default assumption
  }
  
  static getNetworkInfo() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
    return { effectiveType: '4g', downlink: 10, rtt: 50 }; // Default assumption
  }
  
  static getCPUInfo() {
    return {
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      userAgent: navigator.userAgent,
    };
  }
  
  static getStorageInfo() {
    if ('storage' in navigator) {
      return navigator.storage.estimate();
    }
    return Promise.resolve({ quota: 0, usage: 0 });
  }
  
  static getFeatureSupport() {
    return {
      webWorkers: typeof Worker !== 'undefined',
      serviceWorkers: 'serviceWorker' in navigator,
      intersectionObserver: 'IntersectionObserver' in window,
      requestIdleCallback: 'requestIdleCallback' in window,
      webAssembly: 'WebAssembly' in window,
    };
  }
  
  static calculateDeviceTier(capabilities) {
    let score = 0;
    
    // Memory score (0-30 points)
    const memory = capabilities.memory.deviceMemory || 4;
    if (memory >= 8) score += 30;
    else if (memory >= 4) score += 20;
    else score += 10;
    
    // Network score (0-25 points)
    const network = capabilities.network.effectiveType;
    if (network === '4g') score += 25;
    else if (network === '3g') score += 15;
    else score += 5;
    
    // CPU score (0-25 points)
    const cores = capabilities.cpu.hardwareConcurrency;
    if (cores >= 8) score += 25;
    else if (cores >= 4) score += 15;
    else score += 5;
    
    // Feature support score (0-20 points)
    const features = capabilities.features;
    if (features.webWorkers) score += 5;
    if (features.serviceWorkers) score += 5;
    if (features.intersectionObserver) score += 5;
    if (features.webAssembly) score += 5;
    
    // Determine tier
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }
}

export default DeviceCapabilities;
```

**Step 2: Adaptive Component Loader**
```javascript
// src/utils/adaptiveLoader.js
import DeviceCapabilities from './deviceCapabilities';

class AdaptiveLoader {
  constructor() {
    this.capabilities = DeviceCapabilities.getCapabilities();
    this.loadingStrategy = this.determineLoadingStrategy();
  }
  
  determineLoadingStrategy() {
    const { tier, network, memory } = this.capabilities;
    
    if (tier === 'low' || network.saveData) {
      return {
        maxConcurrentLoads: 2,
        preloadingEnabled: false,
        heavyComponentsEnabled: false,
        animationsEnabled: false,
        imageQuality: 'low',
      };
    } else if (tier === 'medium') {
      return {
        maxConcurrentLoads: 4,
        preloadingEnabled: true,
        heavyComponentsEnabled: true,
        animationsEnabled: true,
        imageQuality: 'medium',
      };
    } else {
      return {
        maxConcurrentLoads: 8,
        preloadingEnabled: true,
        heavyComponentsEnabled: true,
        animationsEnabled: true,
        imageQuality: 'high',
      };
    }
  }
  
  async loadComponent(componentName, fallbackComponent = null) {
    const startTime = performance.now();
    
    try {
      if (!this.loadingStrategy.heavyComponentsEnabled) {
        const heavyComponents = ['UploadDataMapping', 'ConfigureApp', 'ViewHierarchy'];
        if (heavyComponents.includes(componentName) && fallbackComponent) {
          console.log(`🔄 Loading fallback for ${componentName} due to device constraints`);
          return fallbackComponent;
        }
      }
      
      const component = await this.importComponent(componentName);
      const loadTime = performance.now() - startTime;
      
      console.log(`✅ ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
      return component;
      
    } catch (error) {
      console.error(`❌ Failed to load ${componentName}:`, error);
      return fallbackComponent;
    }
  }
  
  async importComponent(componentName) {
    // Simulate different loading strategies based on device capability
    if (this.capabilities.tier === 'low') {
      // Load components sequentially for low-tier devices
      await this.throttleLoading();
    }
    
    const componentMap = {
      UploadData: () => import('../components/UploadData'),
      UploadDataMapping: () => import('../components/UploadDataMappingWrapper'),
      ConfigureApp: () => import('../pages/employee/ConfigureApp'),
      CreateChecklist: () => import('../pages/employee/CreateChecklist'),
    };
    
    return componentMap[componentName]?.() || Promise.reject(`Component ${componentName} not found`);
  }
  
  async throttleLoading() {
    // Add delay for low-tier devices to prevent overwhelming
    return new Promise(resolve => setTimeout(resolve, 100));
  }
  
  shouldPreload(route) {
    return this.loadingStrategy.preloadingEnabled && 
           this.capabilities.network.effectiveType !== '2g';
  }
  
  getOptimalBatchSize() {
    return this.loadingStrategy.maxConcurrentLoads;
  }
}

export const adaptiveLoader = new AdaptiveLoader();
```

**Step 3: Progressive Enhancement Component**
```javascript
// src/components/ProgressiveEnhancement.js
import React, { useState, useEffect } from 'react';
import DeviceCapabilities from '../utils/deviceCapabilities';

const ProgressiveEnhancement = ({ children, fallback, requirements = {} }) => {
  const [capabilities, setCapabilities] = useState(null);
  const [canRender, setCanRender] = useState(false);
  
  useEffect(() => {
    const caps = DeviceCapabilities.getCapabilities();
    setCapabilities(caps);
    
    // Check if device meets requirements
    const meets = checkRequirements(caps, requirements);
    setCanRender(meets);
  }, [requirements]);
  
  const checkRequirements = (caps, reqs) => {
    if (reqs.minMemory && caps.memory.deviceMemory < reqs.minMemory) {
      return false;
    }
    
    if (reqs.minNetworkTier) {
      const networkTiers = { '2g': 1, '3g': 2, '4g': 3 };
      if (networkTiers[caps.network.effectiveType] < networkTiers[reqs.minNetworkTier]) {
        return false;
      }
    }
    
    if (reqs.requiredFeatures) {
      for (const feature of reqs.requiredFeatures) {
        if (!caps.features[feature]) {
          return false;
        }
      }
    }
    
    return true;
  };
  
  if (!capabilities) {
    return <div>Checking device capabilities...</div>;
  }
  
  if (!canRender && fallback) {
    return fallback;
  }
  
  return canRender ? children : null;
};

// Usage examples:
export const ExcelProcessorEnhanced = ({ data, onProcess }) => (
  <ProgressiveEnhancement
    requirements={{
      minMemory: 4,
      minNetworkTier: '3g',
      requiredFeatures: ['webWorkers']
    }}
    fallback={<SimpleExcelProcessor data={data} onProcess={onProcess} />}
  >
    <AdvancedExcelProcessor data={data} onProcess={onProcess} />
  </ProgressiveEnhancement>
);

export const MapComponentEnhanced = ({ boundaries }) => (
  <ProgressiveEnhancement
    requirements={{ minMemory: 2 }}
    fallback={<StaticMapView boundaries={boundaries} />}
  >
    <InteractiveMapComponent boundaries={boundaries} />
  </ProgressiveEnhancement>
);

export default ProgressiveEnhancement;
```

---

## 📊 4. Performance Monitoring

### **Objective:**
Implement comprehensive performance monitoring with real-time metrics, alerting, and optimization recommendations.

### **Implementation Strategy:**

#### **4.1 Real-time Performance Monitor**

**Step 1: Performance Metrics Collector**
```javascript
// src/utils/performanceCollector.js
class PerformanceCollector {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.thresholds = {
      fcp: 2000,        // First Contentful Paint
      lcp: 4000,        // Largest Contentful Paint
      fid: 100,         // First Input Delay
      cls: 0.1,         // Cumulative Layout Shift
      componentLoad: 200, // Component load time
    };
    
    this.initializeObservers();
  }
  
  initializeObservers() {
    // Web Vitals Observer
    if ('PerformanceObserver' in window) {
      this.observeWebVitals();
      this.observeResourceTiming();
      this.observeLongTasks();
    }
    
    // Custom component observers
    this.observeComponentPerformance();
  }
  
  observeWebVitals() {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('LCP', lastEntry.startTime, {
        element: lastEntry.element,
        size: lastEntry.size,
      });
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay
    const fidObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        this.recordMetric('FID', entry.processingStart - entry.startTime, {
          eventType: entry.name,
          target: entry.target,
        });
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
    
    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((entryList) => {
      let clsValue = 0;
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.recordMetric('CLS', clsValue);
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  }
  
  observeResourceTiming() {
    const resourceObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name.includes('campaign')) {
          this.recordMetric('ResourceLoad', entry.duration, {
            name: entry.name,
            size: entry.transferSize,
            type: entry.initiatorType,
          });
        }
      }
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
  }
  
  observeLongTasks() {
    const longTaskObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        this.recordMetric('LongTask', entry.duration, {
          name: entry.name,
          attribution: entry.attribution,
        });
      }
    });
    longTaskObserver.observe({ entryTypes: ['longtask'] });
  }
  
  observeComponentPerformance() {
    // Custom component timing
    const componentObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const componentName = node.dataset?.component;
            if (componentName) {
              this.measureComponentRender(componentName, node);
            }
          }
        });
      });
    });
    
    componentObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
  
  measureComponentRender(componentName, element) {
    const startTime = performance.now();
    
    // Wait for component to be fully rendered
    requestAnimationFrame(() => {
      const endTime = performance.now();
      this.recordMetric('ComponentRender', endTime - startTime, {
        component: componentName,
        element: element.tagName,
      });
    });
  }
  
  recordMetric(type, value, metadata = {}) {
    const timestamp = Date.now();
    const metric = {
      type,
      value,
      timestamp,
      metadata,
      isGoodPerformance: this.evaluatePerformance(type, value),
    };
    
    if (!this.metrics.has(type)) {
      this.metrics.set(type, []);
    }
    
    this.metrics.get(type).push(metric);
    
    // Trigger alerts if needed
    this.checkThresholds(metric);
    
    // Send to analytics if configured
    this.sendToAnalytics(metric);
  }
  
  evaluatePerformance(type, value) {
    const threshold = this.thresholds[type.toLowerCase()];
    if (threshold) {
      return value <= threshold;
    }
    return true; // Default to good if no threshold set
  }
  
  checkThresholds(metric) {
    if (!metric.isGoodPerformance) {
      console.warn(`⚠️ Performance threshold exceeded: ${metric.type} = ${metric.value}`);
      
      // Emit custom event for monitoring dashboard
      window.dispatchEvent(new CustomEvent('performanceAlert', {
        detail: metric
      }));
    }
  }
  
  sendToAnalytics(metric) {
    // Send to analytics service (implement based on your analytics provider)
    if (window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_type: metric.type,
        metric_value: metric.value,
        is_good_performance: metric.isGoodPerformance,
      });
    }
  }
  
  getMetrics(type = null, timeRange = null) {
    let metrics = type ? this.metrics.get(type) || [] : 
                         Array.from(this.metrics.values()).flat();
    
    if (timeRange) {
      const cutoff = Date.now() - timeRange;
      metrics = metrics.filter(m => m.timestamp > cutoff);
    }
    
    return metrics;
  }
  
  getPerformanceSummary() {
    const summary = {};
    
    for (const [type, metrics] of this.metrics.entries()) {
      const values = metrics.map(m => m.value);
      summary[type] = {
        count: values.length,
        avg: values.reduce((sum, v) => sum + v, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p75: this.calculatePercentile(values, 75),
        p95: this.calculatePercentile(values, 95),
        goodPerformance: metrics.filter(m => m.isGoodPerformance).length / metrics.length,
      };
    }
    
    return summary;
  }
  
  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * sorted.length);
    return sorted[index];
  }
}

export const performanceCollector = new PerformanceCollector();
```

**Step 2: Performance Dashboard Component**
```javascript
// src/components/PerformanceDashboard.js
import React, { useState, useEffect } from 'react';
import { performanceCollector } from '../utils/performanceCollector';

const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const updateMetrics = () => {
      const summary = performanceCollector.getPerformanceSummary();
      setMetrics(summary);
    };
    
    const handlePerformanceAlert = (event) => {
      setAlerts(prev => [...prev.slice(-9), event.detail]); // Keep last 10 alerts
    };
    
    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    window.addEventListener('performanceAlert', handlePerformanceAlert);
    
    // Initial load
    updateMetrics();
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('performanceAlert', handlePerformanceAlert);
    };
  }, []);
  
  const getPerformanceStatus = (type, data) => {
    if (!data) return 'unknown';
    return data.goodPerformance > 0.8 ? 'good' : 
           data.goodPerformance > 0.6 ? 'needs-improvement' : 'poor';
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return '#22c55e';
      case 'needs-improvement': return '#f59e0b';
      case 'poor': return '#ef4444';
      default: return '#6b7280';
    }
  };
  
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 9999,
          padding: '8px 12px',
          background: '#1f2937',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        📊 Performance
      </button>
    );
  }
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '400px',
      maxHeight: '600px',
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      zIndex: 9999,
      overflow: 'auto',
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ padding: '16px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Core Web Vitals</h4>
        {['LCP', 'FID', 'CLS'].map(vital => {
          const data = metrics[vital];
          const status = getPerformanceStatus(vital, data);
          
          return (
            <div key={vital} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              padding: '8px',
              background: '#f9fafb',
              borderRadius: '4px',
            }}>
              <span style={{ fontSize: '12px', fontWeight: '500' }}>{vital}</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: getStatusColor(status),
                  display: 'inline-block',
                  marginRight: '8px',
                }} />
                <span style={{ fontSize: '12px' }}>
                  {data ? `${data.avg.toFixed(0)}ms` : 'N/A'}
                </span>
              </div>
            </div>
          );
        })}
        
        <h4 style={{ margin: '16px 0 12px 0', fontSize: '14px' }}>Component Performance</h4>
        {['ComponentRender', 'ResourceLoad'].map(metric => {
          const data = metrics[metric];
          
          return (
            <div key={metric} style={{
              marginBottom: '8px',
              padding: '8px',
              background: '#f9fafb',
              borderRadius: '4px',
              fontSize: '12px',
            }}>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>{metric}</div>
              <div>Count: {data?.count || 0}</div>
              <div>Avg: {data ? `${data.avg.toFixed(2)}ms` : 'N/A'}</div>
              <div>P95: {data ? `${data.p95.toFixed(2)}ms` : 'N/A'}</div>
            </div>
          );
        })}
        
        {alerts.length > 0 && (
          <>
            <h4 style={{ margin: '16px 0 12px 0', fontSize: '14px', color: '#ef4444' }}>
              Recent Alerts
            </h4>
            <div style={{ maxHeight: '120px', overflow: 'auto' }}>
              {alerts.slice(-5).map((alert, index) => (
                <div key={index} style={{
                  padding: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  fontSize: '12px',
                }}>
                  <div style={{ fontWeight: '500', color: '#dc2626' }}>{alert.type}</div>
                  <div>Value: {alert.value.toFixed(2)}</div>
                  <div>Time: {new Date(alert.timestamp).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PerformanceDashboard;
```

---

## 🚀 Implementation Timeline

### **Week 7: Web Workers & Service Workers**

**Day 1-2: Web Workers**
- Create Excel processing worker
- Implement worker manager
- Update heavy components to use workers
- Test worker performance vs main thread

**Day 3-4: Service Workers**
- Implement service worker with caching strategies
- Set up cache management
- Test offline functionality
- Monitor cache hit rates

**Day 5: Integration & Testing**
- Integrate both optimizations
- Performance testing
- Memory usage optimization
- Cross-browser testing

### **Week 8: Progressive Enhancement & Monitoring**

**Day 1-2: Progressive Enhancement**
- Device capability detection
- Adaptive loading implementation
- Progressive enhancement components
- Fallback component development

**Day 3-4: Performance Monitoring**
- Real-time metrics collection
- Performance dashboard
- Alert system implementation
- Analytics integration

**Day 5: Final Integration**
- End-to-end testing
- Performance benchmarking
- Documentation updates
- Production deployment preparation

---

## 📊 Expected Outcomes

### **Performance Improvements:**
- **70% reduction** in main thread blocking time
- **85% improvement** in cache hit rates
- **50% faster** component loading on repeat visits
- **90% reduction** in network requests for cached resources

### **User Experience:**
- Seamless offline functionality
- Device-appropriate experiences
- Real-time performance feedback
- Adaptive loading based on capabilities

### **Developer Benefits:**
- Comprehensive performance insights
- Automated optimization recommendations
- Device-specific debugging capabilities
- Production performance monitoring

This advanced optimization phase will complete the transformation of the Campaign Module into a highly performant, adaptive, and monitored application component.