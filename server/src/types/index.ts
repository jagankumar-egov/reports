export interface DataPoint {
  name: string;
  slug: string;
  description?: string;
  source: {
    indices: string[];
    timeField?: string;
    defaultTimeRange?: string;
  };
  query?: any;
  projections?: string[];
  aggs?: any;
  sampleColumns?: string[];
  tags?: string[];
  version: number;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  isArchived: boolean;
}

export interface Dashboard {
  name: string;
  slug: string;
  description?: string;
  layout: {
    type: string;
    cols: number;
    rowHeight: number;
  };
  widgets: Widget[];
  tags?: string[];
  version: number;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  isArchived: boolean;
}

export interface Widget {
  id: string;
  type: 'line' | 'bar' | 'area' | 'pie' | 'table' | 'kpi' | 'scatter' | 'heatmap';
  title: string;
  dataPointId: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  overrides?: any;
}

export interface UserContext {
  role: 'reports-admin' | 'reports-viewer';
  username: string;
}