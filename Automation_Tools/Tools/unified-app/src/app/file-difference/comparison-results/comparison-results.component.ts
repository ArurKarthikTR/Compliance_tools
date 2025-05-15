import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ProcessedRow {
  path: string;
  sourceValue: any;
  targetValue: any;
  status: string;
}

interface CellDifference {
  column: string;
  rowIndex: number;
  sourceValue: any;
  targetValue: any;
  status: string;
}

interface TableData {
  headers: string[];
  rows: any[][];
  diffMap: Map<string, string>; // key: "row-col", value: status
  diffValueMap: Map<string, {source: any, target: any}>; // key: "row-col", values: source and target
  changedValuesCount?: number; // Count of changed values
  removedValuesCount?: number; // Count of values only in source
  targetOnlyCount?: number; // Count of values only in target
}

@Component({
  selector: 'app-comparison-results',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comparison-results.component.html',
  styleUrls: ['./comparison-results.component.scss']
})
export class ComparisonResultsComponent implements OnChanges {
  @Input() comparisonData: any = null;
  @Output() resetView = new EventEmitter<void>();
  
  // XML comparison properties
  processedRows: ProcessedRow[] = [];
  private allXmlRows: ProcessedRow[] = [];
  
  // CSV/XLSX comparison properties
  tableData: TableData = { 
    headers: [], 
    rows: [], 
    diffMap: new Map<string, string>(),
    diffValueMap: new Map<string, {source: any, target: any}>()
  };
  filteredRows: any[][] = [];
  
  // Common properties
  summary: any = {};
  fileType: string = '';
  showOnlyDifferences: boolean = false;
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['comparisonData'] && this.comparisonData) {
      console.log('ComparisonResultsComponent received data:', this.comparisonData);
      this.processComparisonData();
    }
  }
  
  processComparisonData(): void {
    if (!this.comparisonData) {
      console.warn('No comparison data to process');
      return;
    }
    
    this.fileType = this.comparisonData.fileType || '';
    this.summary = this.comparisonData.summary || {};
    
    console.log('Processing comparison data for file type:', this.fileType);
    
    // Process data based on file type
    if (this.fileType === 'xml') {
      this.processXmlData();
    } else {
      // For CSV and XLSX
      this.processCsvXlsxData();
    }
  }
  
  // XML data processing
  processXmlData(): void {
    console.log('Processing XML data');
    
    // Reset counts to calculate fresh values
    let totalNodesCount = 0;
    let matchingNodesCount = 0;
    let differingNodesCount = 0;
    let changedValuesCount = 0;
    let removedValuesCount = 0;
    let targetOnlyCount = 0;
    
    // Create a map to store unique paths and their values
    const pathMap = new Map<string, ProcessedRow>();
    // Store original order of paths as they appear in source
    let orderedPaths: string[] = [];
    
    // Check if we have columns data from the backend (these represent paths in source order)
    // This is crucial for maintaining the original XML structure order
    if (this.comparisonData.columns && Array.isArray(this.comparisonData.columns)) {
      console.log('Using backend-provided column order:', this.comparisonData.columns.length);
      orderedPaths = [...this.comparisonData.columns];
    }
    
    // Process each row (each row represents a node in XML)
    this.comparisonData.rows.forEach((row: any) => {
      // For XML, each row.cells object contains paths and their comparison info
      Object.entries(row.cells || {}).forEach(([path, cell]: [string, any]) => {
              // Process cells (we'll filter out empty nodes later)
              if (cell) {
          // If we don't have orderedPaths from backend and path not already tracked, add it
          // This is a fallback but we should always prefer the backend-provided order
          if (orderedPaths.length === 0 && !pathMap.has(path)) {
            orderedPaths.push(path);
          }
          
          totalNodesCount++;
          
          // Use the status directly from the backend if available
          let status = cell.status;
          
          // If status is not provided, determine it based on source and target values
          if (!status) {
            if (cell.sourceValue !== null && cell.sourceValue !== undefined && 
                cell.targetValue !== null && cell.targetValue !== undefined) {
              status = cell.sourceValue !== cell.targetValue ? 'different' : 'match';
            } else if (cell.sourceValue !== null && cell.sourceValue !== undefined) {
              status = 'source_only';
            } else if (cell.targetValue !== null && cell.targetValue !== undefined) {
              status = 'target_only';
            } else {
              status = 'match'; // Both null/undefined
            }
          }
          
          // Count based on status
          if (status === 'match') {
            matchingNodesCount++;
          } else if (status === 'different') {
            changedValuesCount++;
            differingNodesCount++;
          } else if (status === 'source_only') {
            removedValuesCount++;
            differingNodesCount++;
          } else if (status === 'target_only') {
            targetOnlyCount++;
            differingNodesCount++;
          }
          
          // Always update the path map with latest values
          pathMap.set(path, {
            path: path,
            sourceValue: cell.sourceValue !== undefined ? cell.sourceValue : null,
            targetValue: cell.targetValue !== undefined ? cell.targetValue : null,
            status: status
          });
        }
      });
    });
    
    // Update counts with calculated values
    this.summary.totalRows = totalNodesCount;
    this.summary.matchingRows = matchingNodesCount;
    this.summary.differingRows = differingNodesCount;
    
    // Additional summary data for XML
    this.summary.changedValuesCount = changedValuesCount;
    this.summary.removedValuesCount = removedValuesCount;
    this.summary.targetOnlyCount = targetOnlyCount;
    
    console.log(`XML counts - Total: ${totalNodesCount}, Matching: ${matchingNodesCount}, Differing: ${differingNodesCount}`);
    
    // Use the original path order from source file
    this.processedRows = [];
    
    // Ensure all paths are included, even if they weren't in the orderedPaths array
    // This handles any target-only paths that might exist
    const allPaths = new Set([...orderedPaths, ...Array.from(pathMap.keys())]);
    
    // First add paths in the ordered list to maintain source file structure
    orderedPaths.forEach(path => {
      const row = pathMap.get(path);
      if (row) {
        this.processedRows.push(row);
      }
    });
    
    // Then add any remaining paths that weren't in the ordered list (target-only paths)
    allPaths.forEach(path => {
      if (!orderedPaths.includes(path)) {
        const row = pathMap.get(path);
        if (row) {
          this.processedRows.push(row);
        }
      }
    });
    
    // Store original rows for filtering
    this.allXmlRows = [...this.processedRows];
    
    console.log(`Transformed XML data has ${this.processedRows.length} rows`);
  }
  
  // Implementation for CSV/XLSX data processing
  processCsvXlsxData(): void {
    console.log('Processing CSV/XLSX data');
    
    if (!this.comparisonData.sourceData) {
      console.warn('Missing source data for comparison');
      return;
    }
    
    // Extract headers from source data
    const headers = this.comparisonData.headers || [];
    
    // Initialize table data
    this.tableData = {
      headers: ['Row', ...headers],
      rows: [],
      diffMap: new Map<string, string>(),
      diffValueMap: new Map<string, {source: any, target: any}>(),
      changedValuesCount: 0,
      removedValuesCount: 0,
      targetOnlyCount: 0
    };
    
    // Use summary data from backend
    if (this.comparisonData.summary) {
      this.summary = this.comparisonData.summary;
    } else {
      // Fallback to empty summary
      this.summary = {
        totalRows: 0,
        matchingRows: 0,
        differingRows: 0
      };
    }
    
    // Process source rows
    const sourceRows = this.comparisonData.sourceData || [];
    
    // Process each source row
    sourceRows.forEach((sourceRow: any, index: number) => {
      if (!sourceRow) return;
      
      const tableRow = [index + 1]; // Row number (1-based)
      
      // Process each column in the row
      for (const header of headers) {
        const sourceValue = sourceRow[header];
        
        // Add source value to row for display
        tableRow.push(sourceValue !== undefined && sourceValue !== null ? sourceValue : '');
      }
      
      // Add row to table data
      this.tableData.rows.push(tableRow);
    });
    
    // Process differences from backend
    if (this.comparisonData.differences && Array.isArray(this.comparisonData.differences)) {
      this.comparisonData.differences.forEach((diff: any) => {
        if (!diff || typeof diff.rowIndex !== 'number' || !diff.column) return;
        
        const rowIndex = diff.rowIndex;
        const column = diff.column;
        const sourceValue = diff.sourceValue;
        const targetValue = diff.targetValue;
        
        // Create a key for the difference map
        const key = `${rowIndex}-${column}`;
        
        // Determine the status
        let status = 'different';
        if (sourceValue === null || sourceValue === undefined) {
          status = 'target_only';
          this.tableData.targetOnlyCount = (this.tableData.targetOnlyCount || 0) + 1;
        } else if (targetValue === null || targetValue === undefined) {
          status = 'source_only';
          this.tableData.removedValuesCount = (this.tableData.removedValuesCount || 0) + 1;
        } else {
          this.tableData.changedValuesCount = (this.tableData.changedValuesCount || 0) + 1;
        }
        
        // Store the difference
        this.tableData.diffMap.set(key, status);
        this.tableData.diffValueMap.set(key, {
          source: sourceValue,
          target: targetValue
        });
      });
    }
    
    // Initialize filtered rows with all rows
    this.filteredRows = [...this.tableData.rows];
    
    console.log(`CSV/XLSX data processed: ${this.tableData.rows.length} total rows`);
  }
  
  // Toggle showing only differences
  toggleDifferencesOnly(): void {
    // For XML files, filter to show only differences
    if (this.fileType === 'xml') {
      if (this.showOnlyDifferences) {
        // Show only rows with changed values (different status)
        this.processedRows = this.allXmlRows.filter(row => 
          (row.status === 'different' || row.status === 'source_only' || row.status === 'target_only') &&
          // Also filter out empty values
          (row.sourceValue !== null && row.sourceValue !== '' || row.targetValue !== null && row.targetValue !== '')
        );
      } else {
        // Show all rows but still filter out empty tags
        this.processedRows = this.allXmlRows.filter(row => 
          (row.sourceValue !== null && row.sourceValue !== '' || row.targetValue !== null && row.targetValue !== '')
        );
      }
      
      console.log(`Filtered XML rows to ${this.processedRows.length} rows (showing only changes: ${this.showOnlyDifferences})`);
      return;
    }
    
    // For CSV/XLSX files, apply filtering
    if (this.showOnlyDifferences) {
      // Create a set to track rows with differences
      const rowsWithDifferences = new Set<number>();
      
      // Identify rows with differences
      for (let rowIndex = 0; rowIndex < this.tableData.rows.length; rowIndex++) {
        for (let colIndex = 1; colIndex < this.tableData.headers.length; colIndex++) {
          const column = this.tableData.headers[colIndex];
          const key = `${rowIndex}-${column}`;
          
          if (this.tableData.diffMap.has(key)) {
            rowsWithDifferences.add(rowIndex);
            break;
          }
        }
      }
      
      // Filter to only show rows with differences
      this.filteredRows = this.tableData.rows.filter((_, rowIndex) => 
        rowsWithDifferences.has(rowIndex)
      );
      
      console.log(`Filtered to ${this.filteredRows.length} rows with differences`);
    } else {
      // Show all rows
      this.filteredRows = [...this.tableData.rows];
      console.log(`Showing all ${this.filteredRows.length} rows`);
    }
  }
  
  // Get CSS class for cell styling
  getCellClass(rowIndex: number | string, column: string): string {
    if (!column) return '';
    
    // Ensure rowIndex is a number for key generation
    const numericRowIndex = typeof rowIndex === 'string' ? parseInt(rowIndex, 10) : rowIndex;
    
    const key = `${numericRowIndex}-${column}`;
    const status = this.tableData.diffMap.get(key);
    
    if (!status) return '';
    
    // For CSV/XLSX files
    if (this.fileType === 'csv' || this.fileType === 'xlsx') {
      if (status === 'different') {
        return 'source-value'; // Green for original values
      } else if (status === 'source_only') {
        return 'source-only-value';
      } else if (status === 'target_only') {
        return 'target-only-value';
      }
    } else if (this.fileType === 'xml') {
      // For XML files
      switch (status) {
        case 'match': return 'match-value';
        case 'different': return 'different-value';
        case 'source_only': return 'source-only-value';
        case 'target_only': return 'target-only-value';
      }
    }
    
    return '';
  }
  
  // Get target value for a cell (used to show changed value)
  getTargetValue(rowIndex: number | string, column: string): any {
    const numericRowIndex = typeof rowIndex === 'string' ? parseInt(rowIndex, 10) : rowIndex;
    const key = `${numericRowIndex}-${column}`;
    const diffValues = this.tableData.diffValueMap.get(key);
    return diffValues ? diffValues.target : null;
  }
  
  // Get source value for a cell (used to show original value)
  getSourceValue(rowIndex: number | string, column: string): any {
    const numericRowIndex = typeof rowIndex === 'string' ? parseInt(rowIndex, 10) : rowIndex;
    const key = `${numericRowIndex}-${column}`;
    const diffValues = this.tableData.diffValueMap.get(key);
    return diffValues ? diffValues.source : null;
  }
  
  // Check if a cell has a difference
  hasDifference(rowIndex: number | string, column: string): boolean {
    const numericRowIndex = typeof rowIndex === 'string' ? parseInt(rowIndex, 10) : rowIndex;
    const key = `${numericRowIndex}-${column}`;
    return this.tableData.diffMap.has(key);
  }
  
  // Clean node path for XML display
  cleanNodePath(path: string): string {
    if (!path) return path;
    return path.replace(/\{[^}]*\}/g, '');
  }
  
  // Go back to upload view
  goBackToUpload(): void {
    this.resetView.emit();
  }
  
  // Download results as JSON
  downloadResults(): void {
    if (!this.comparisonData) return;
    
    const jsonString = JSON.stringify(this.comparisonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-results-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
