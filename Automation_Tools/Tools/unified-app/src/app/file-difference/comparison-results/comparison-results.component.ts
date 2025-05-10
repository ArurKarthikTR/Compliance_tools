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
  diffValueMap?: Map<string, {original: any, changed: any}>; // key: "row-col", values: original and changed
  changedValuesCount?: number;
  removedValuesCount?: number;
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
  
  columns: string[] = [];
  rows: any[] = [];
  processedRows: ProcessedRow[] = [];
  cellDifferences: CellDifference[] = [];
  tableData: TableData = { headers: [], rows: [], diffMap: new Map<string, string>() };
  filteredRows: any[][] = [];
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
    
    console.log('Processing comparison data...');
    
    this.columns = this.comparisonData.columns || [];
    this.rows = this.comparisonData.rows || [];
    this.summary = this.comparisonData.summary || {};
    this.fileType = this.comparisonData.fileType || '';
    
    console.log('Processing comparison data for file type:', this.fileType);
    console.log('Columns:', this.columns);
    console.log('Rows count:', this.rows.length);
    console.log('Summary:', this.summary);
    
    // Process data based on file type
    if (this.fileType === 'xml') {
      console.log('Processing XML data');
      this.processedRows = this.transformXmlForDisplay();
      console.log('Processed XML rows:', this.processedRows.length);
    } else {
      // For CSV and XLSX
      console.log('Processing CSV/XLSX data');
      this.cellDifferences = this.extractCellDifferences();
      console.log('Cell differences:', this.cellDifferences.length);
      this.tableData = this.transformToTableFormat();
      console.log('Table data rows:', this.tableData.rows.length);
      
      // Initialize filtered rows
      this.filteredRows = [...this.tableData.rows];
    }
  }
  
  toggleDifferencesOnly(): void {
    if (this.showOnlyDifferences) {
      // Filter to show only rows with differences
      this.filteredRows = this.tableData.rows.filter((row, rowIndex) => {
        // Check if any cell in this row has a difference
        for (let colIndex = 1; colIndex < this.tableData.headers.length; colIndex++) {
          const column = this.tableData.headers[colIndex];
          const key = `${rowIndex}-${column}`;
          const status = this.tableData.diffMap.get(key);
          
          if (status === 'different' || status === 'source_only' || status === 'target_only') {
            return true;
          }
        }
        return false;
      });
    } else {
      // Show all rows
      this.filteredRows = [...this.tableData.rows];
    }
    
    console.log(`Filtered to ${this.filteredRows.length} rows (showing only differences: ${this.showOnlyDifferences})`);
  }
  
  transformToTableFormat(): TableData {
    // Extract actual column names from the data
    const actualColumns: string[] = [];
    const columnMap = new Map<string, string>();
    
    // First, find the header row (usually row 2 or 3)
    let headerRowIndex = -1;
    
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      let potentialHeaderCount = 0;
      
      // Check if this row has values that look like headers
      this.columns.forEach(column => {
        const cell = row.cells[column];
        if (cell && cell.sourceValue && typeof cell.sourceValue === 'string' && 
            !cell.sourceValue.includes('(empty)') && 
            cell.sourceValue !== 'Project Management Data') {
          potentialHeaderCount++;
        }
      });
      
      // If we found multiple potential headers, this is likely our header row
      if (potentialHeaderCount > 2) {
        headerRowIndex = i;
        break;
      }
    }
    
    // If we found a header row, use it to map column names
    if (headerRowIndex >= 0) {
      const headerRow = this.rows[headerRowIndex];
      
      this.columns.forEach(column => {
        const cell = headerRow.cells[column];
        if (cell && cell.sourceValue) {
          columnMap.set(column, String(cell.sourceValue));
          actualColumns.push(String(cell.sourceValue));
        }
      });
    } else {
      // Fallback: just use the original column names
      this.columns.forEach(column => {
        actualColumns.push(column);
        columnMap.set(column, column);
      });
    }
    
    const result: TableData = {
      headers: ['Row', ...actualColumns],
      rows: [],
      diffMap: new Map<string, string>()
    };
    
    if (!this.rows || !this.columns) {
      console.warn('No rows or columns data available');
      return result;
    }
    
    // Skip the header row when processing data
    const dataStartIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
    
    // Group differences by row
    const rowMap = new Map<number, Map<string, any>>();
    const diffStatusMap = new Map<string, string>();
    const diffValueMap = new Map<string, {original: any, changed: any}>();
    
    // Count changes and removals
    let changedValuesCount = 0;
    let removedValuesCount = 0;
    
    for (let i = dataStartIndex; i < this.rows.length; i++) {
      const row = this.rows[i];
      const rowIndex = i - dataStartIndex;
      
      if (!rowMap.has(rowIndex)) {
        rowMap.set(rowIndex, new Map<string, any>());
      }
      
      const rowData = rowMap.get(rowIndex)!;
      
      this.columns.forEach((column, colIndex) => {
        const cell = row.cells[column];
        const mappedColumn = columnMap.get(column) || column;
        
        if (cell) {
          // For display, use the source value by default
          rowData.set(mappedColumn, cell.sourceValue);
          
          // Store the status for highlighting
          const key = `${rowIndex}-${mappedColumn}`;
          diffStatusMap.set(key, cell.status);
          
          // If values are different, store both values
          if (cell.status === 'different') {
            diffValueMap.set(key, {
              original: cell.sourceValue,
              changed: cell.targetValue
            });
            changedValuesCount++;
          } else if (cell.status === 'source_only') {
            removedValuesCount++;
          }
        }
      });
    }
    
    // Convert to array format for template
    Array.from(rowMap.entries()).sort((a, b) => a[0] - b[0]).forEach(([rowIndex, rowData]) => {
      const rowArray = [rowIndex + 1]; // Add row number (1-based)
      
      actualColumns.forEach(column => {
        rowArray.push(rowData.get(column));
      });
      
      result.rows.push(rowArray);
    });
    
    result.diffMap = diffStatusMap;
    result.diffValueMap = diffValueMap;
    result.changedValuesCount = changedValuesCount;
    result.removedValuesCount = removedValuesCount;
    
    return result;
  }
  
  transformXmlForDisplay(): ProcessedRow[] {
    const result: ProcessedRow[] = [];
    
    if (!this.rows || !this.columns) {
      console.warn('No XML data to transform');
      return result;
    }
    
    // Create a map to store unique paths and their values
    const pathMap = new Map<string, ProcessedRow>();
    
    // First pass: collect all unique paths and their values
    this.rows.forEach(row => {
      Object.entries(row.cells).forEach(([column, cell]: [string, any]) => {
        if (cell && (cell.sourceValue !== null || cell.targetValue !== null)) {
          // If the path already exists in the map, update it only if it has values
          if (!pathMap.has(column) || 
              (pathMap.get(column)!.sourceValue === null && pathMap.get(column)!.targetValue === null)) {
            pathMap.set(column, {
              path: column,
              sourceValue: cell.sourceValue,
              targetValue: cell.targetValue,
              status: cell.status
            });
          }
        }
      });
    });
    
    // Convert map to array and sort by path
    const sortedEntries = Array.from(pathMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    // Filter out entries where both source and target values are null
    sortedEntries.forEach(([_, row]) => {
      if (row.sourceValue !== null || row.targetValue !== null) {
        result.push(row);
      }
    });
    
    return result;
  }
  
  extractCellDifferences(): CellDifference[] {
    const differences: CellDifference[] = [];
    
    if (!this.rows || !this.columns) {
      console.warn('No data to extract cell differences from');
      return differences;
    }
    
    // For each row in the comparison data
    this.rows.forEach((row, rowIndex) => {
      // For each column in the row
      this.columns.forEach(column => {
        const cell = row.cells[column];
        if (cell) {
          // Include all cells for CSV/XLSX to show a complete view
          // For a cleaner view, you could filter to only show differences:
          // if (cell.status !== 'match') {
          differences.push({
            column: column,
            rowIndex: rowIndex,
            sourceValue: cell.sourceValue,
            targetValue: cell.targetValue,
            status: cell.status
          });
          // }
        }
      });
    });
    
    // Sort by column and row for better readability
    return differences.sort((a, b) => {
      if (a.column === b.column) {
        return a.rowIndex - b.rowIndex;
      }
      return a.column.localeCompare(b.column);
    });
  }
  
  goBackToUpload(): void {
    this.resetView.emit();
  }
  
  getCellClass(rowIndex: number, column: string): string {
    if (!column) return '';
    
    const key = `${rowIndex}-${column}`;
    const status = this.tableData.diffMap?.get(key);
    
    if (!status) return '';
    
    let classNames = '';
    
    // Add status-based class
    switch (status) {
      case 'match':
        classNames = 'match-value';
        break;
      case 'different':
        // Check if we have both source and target values
        const sourceKey = `${rowIndex}-${column}-source`;
        const targetKey = `${rowIndex}-${column}-target`;
        if (this.tableData.diffMap?.has(sourceKey) && this.tableData.diffMap?.has(targetKey)) {
          classNames = 'different-value';
        } else {
          classNames = 'correct-value';
        }
        break;
      case 'source_only':
        classNames = 'source-only-value';
        break;
      case 'target_only':
        classNames = 'target-only-value';
        break;
    }
    
    // Add content-type class
    const contentClass = this.getCellContentClass(rowIndex, column);
    if (contentClass) {
      classNames += ' ' + contentClass;
    }
    
    return classNames;
  }
  
  getCellContentClass(rowIndex: number, column: string): string {
    // Get the cell value
    const row = this.filteredRows[rowIndex];
    if (!row) return '';
    
    const colIndex = this.tableData.headers.indexOf(column);
    if (colIndex < 0) return '';
    
    const value = row[colIndex];
    
    // Check if it's a numeric value
    if (value === null || value === undefined) return '';
    
    const strValue = String(value).trim();
    
    // Check if it's a number (including decimal points)
    if (/^-?\d+(\.\d+)?$/.test(strValue)) {
      return 'numeric-content';
    }
    
    // Check if it's a date format
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(strValue) || 
        /^\d{2,4}[-/]\d{1,2}[-/]\d{1,2}$/.test(strValue)) {
      return 'numeric-content';
    }
    
    // For longer text content
    if (strValue.length > 10 || strValue.includes(' ')) {
      return 'text-content';
    }
    
    // Default to numeric for short values without spaces
    return 'numeric-content';
  }
  
  downloadResults(): void {
    if (!this.comparisonData) {
      return;
    }
    
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
