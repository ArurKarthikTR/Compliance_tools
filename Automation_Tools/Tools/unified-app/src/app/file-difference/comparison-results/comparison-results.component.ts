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
  targetOnlyCount?: number;
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
    
    // For XML comparison, we need to calculate all count values correctly
    if (this.fileType === 'xml') {
      console.log('Calculating counts for XML comparison');
      
      // Reset counts to calculate fresh values
      let totalNodesCount = 0;
      let matchingNodesCount = 0;
      let differingNodesCount = 0;
      let changedValuesCount = 0;
      let removedValuesCount = 0;
      let targetOnlyCount = 0;
      
      // Process each row (each row represents a node in XML)
      this.rows.forEach(row => {
        // For XML, each row.cells object contains paths and their comparison info
        Object.entries(row.cells || {}).forEach(([path, cell]: [string, any]) => {
          if (cell) {
            totalNodesCount++;
            
            if (cell.status === 'match') {
              matchingNodesCount++;
            } else if (cell.status === 'different') {
              changedValuesCount++;
              differingNodesCount++;
            } else if (cell.status === 'source_only') {
              removedValuesCount++;
              differingNodesCount++;
            } else if (cell.status === 'target_only') {
              targetOnlyCount++;
              differingNodesCount++;
            }
          }
        });
      });
      
      // Update counts with calculated values
      this.summary.totalRows = totalNodesCount;
      this.summary.matchingRows = matchingNodesCount;
      this.summary.differingRows = differingNodesCount;
      
      // Update the tableData with calculated counts
      this.tableData.changedValuesCount = changedValuesCount;
      this.tableData.removedValuesCount = removedValuesCount;
      this.tableData.targetOnlyCount = targetOnlyCount;
      
      console.log(`XML counts - Total: ${totalNodesCount}, Matching: ${matchingNodesCount}, Differing: ${differingNodesCount}, Changed: ${changedValuesCount}, Removed: ${removedValuesCount}, Target Only: ${targetOnlyCount}`);
    }
    
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
  
  // Store original XML rows for toggling
  private allXmlRows: ProcessedRow[] = [];
  
  toggleDifferencesOnly(): void {
    // For XML files, filter to show only differences
    if (this.fileType === 'xml') {
      if (this.allXmlRows.length === 0) {
        // Store original rows first time
        this.allXmlRows = [...this.processedRows];
      }
      
      if (this.showOnlyDifferences) {
        // Show only rows with changed values (different status)
        this.processedRows = this.allXmlRows.filter(row => 
          row.status === 'different'
        );
      } else {
        // Show all rows
        this.processedRows = [...this.allXmlRows];
      }
      
      console.log(`Filtered XML rows to ${this.processedRows.length} rows (showing only changes: ${this.showOnlyDifferences})`);
      return;
    }
    
    // For CSV/XLSX files, apply filtering
    if (this.showOnlyDifferences) {
      // Create a set to track rows with actual differences
      const rowsWithDifferences = new Set<number>();
      
      // First, identify all rows that have actual differences (red and green values)
      for (let rowIndex = 0; rowIndex < this.tableData.rows.length; rowIndex++) {
        let hasRealDifference = false;
        
        for (let colIndex = 1; colIndex < this.tableData.headers.length; colIndex++) {
          const column = this.tableData.headers[colIndex];
          const key = `${rowIndex}-${column}`;
          const status = this.tableData.diffMap.get(key);
          
          // Check for cells with actual differences (red and green values)
          if (status === 'different') {
            const diffValues = this.tableData.diffValueMap?.get(key);
            
            // Only consider it a difference if both values exist and are different
            if (diffValues && 
                diffValues.original !== undefined && diffValues.changed !== undefined &&
                diffValues.original !== diffValues.changed) {
              
              // Convert to strings for comparison
              const originalStr = diffValues.original !== null ? String(diffValues.original) : '';
              const changedStr = diffValues.changed !== null ? String(diffValues.changed) : '';
              
              // Only consider it a difference if the string values are different
              if (originalStr !== changedStr) {
                hasRealDifference = true;
                break;
              }
            }
          } else if (status === 'source_only' || status === 'target_only') {
            // These are also considered differences (red or green values)
            hasRealDifference = true;
            break;
          }
        }
        
        // Only add rows that have actual differences (red and green values)
        if (hasRealDifference) {
          rowsWithDifferences.add(rowIndex);
        }
      }
      
      console.log(`Found ${rowsWithDifferences.size} rows with actual differences (red and green values)`);
      
      // Filter to only show rows with differences
      this.filteredRows = this.tableData.rows.filter((row, rowIndex) => 
        rowsWithDifferences.has(rowIndex)
      );
      
      // Create a new diffValueMap that maps the new row indices to the original values
      if (this.tableData.diffValueMap) {
        const newDiffValueMap = new Map<string, {original: any, changed: any}>();
        const originalRowIndices = Array.from(rowsWithDifferences);
        
        // For each row in the filtered rows
        this.filteredRows.forEach((row, newRowIndex) => {
          // Get the original row index
          const originalRowIndex = originalRowIndices[newRowIndex];
          
          // For each column
          for (let colIndex = 1; colIndex < this.tableData.headers.length; colIndex++) {
            const column = this.tableData.headers[colIndex];
            const originalKey = `${originalRowIndex}-${column}`;
            const newKey = `${newRowIndex}-${column}`;
            
            // If there's a diff value for this cell, copy it to the new map with the new row index
            if (this.tableData.diffValueMap?.has(originalKey)) {
              newDiffValueMap.set(newKey, this.tableData.diffValueMap.get(originalKey)!);
            }
          }
        });
        
        // Replace the original diffValueMap with the new one
        this.tableData.diffValueMap = newDiffValueMap;
      }
      
      console.log(`Filtered to ${this.filteredRows.length} rows with actual differences (red and green values)`);
    } else {
      // Show all rows
      this.filteredRows = [...this.tableData.rows];
      
      // Restore the original diffValueMap
      if (this.tableData.diffValueMap) {
        const originalDiffValueMap = new Map<string, {original: any, changed: any}>();
        
        // For each row
        this.tableData.rows.forEach((row, rowIndex) => {
          // For each column
          for (let colIndex = 1; colIndex < this.tableData.headers.length; colIndex++) {
            const column = this.tableData.headers[colIndex];
            const key = `${rowIndex}-${column}`;
            const status = this.tableData.diffMap.get(key);
            
            // If this cell has a difference status
            if (status === 'different') {
              // Get the original and changed values from the row data
              const originalValue = row[colIndex];
              const changedValue = this.tableData.diffValueMap?.get(key)?.changed;
              
              // Add to the original diffValueMap
              if (changedValue !== undefined) {
                originalDiffValueMap.set(key, {
                  original: originalValue,
                  changed: changedValue
                });
              }
            }
          }
        });
        
        // Replace the diffValueMap with the original one
        this.tableData.diffValueMap = originalDiffValueMap;
      }
      
      console.log(`Showing all ${this.filteredRows.length} rows`);
    }
  }
  
  transformToTableFormat(): TableData {
    // Extract actual column names from the data
    const actualColumns: string[] = [];
    const columnMap = new Map<string, string>();
    
    // Variable to track header row index (used for both CSV and XLSX)
    let headerRowIndex = -1;
    
    // For CSV files, use the column names directly from the data
    if (this.fileType === 'csv') {
      // Use the original column names from the CSV file
      this.columns.forEach(column => {
        actualColumns.push(column);
        columnMap.set(column, column);
      });
    } else {
      // For XLSX files, use the column names directly from the backend
      // These should already be properly extracted by the backend's Excel processing
      console.log('Using column names from backend for XLSX file:', this.columns);
      
      // Use the column names as they are
      this.columns.forEach(column => {
        // Clean up column names if needed
        const cleanColumnName = column.replace(/^Unnamed: \d+$/, '').trim();
        const displayName = cleanColumnName || column; // Use original if cleaned is empty
        
        actualColumns.push(displayName);
        columnMap.set(column, displayName);
      });
      
      // Log the column mapping for debugging
      console.log('Column mapping:', Object.fromEntries(columnMap));
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
    
    // For XLSX files, we don't need to skip any rows as the backend should have already
    // identified and used the header row correctly
    const dataStartIndex = 0;
    
    // Group differences by row
    const rowMap = new Map<number, Map<string, any>>();
    const diffStatusMap = new Map<string, string>();
    const diffValueMap = new Map<string, {original: any, changed: any}>();
    
    // Count changes and removals
    let changedValuesCount = 0;
    let removedValuesCount = 0;
    
    console.log(`Processing ${this.rows.length} data rows`);
    
    for (let i = dataStartIndex; i < this.rows.length; i++) {
      const row = this.rows[i];
      const rowIndex = i - dataStartIndex;
      
      if (!rowMap.has(rowIndex)) {
        rowMap.set(rowIndex, new Map<string, any>());
      }
      
      const rowData = rowMap.get(rowIndex)!;
      let hasData = false;
      
      this.columns.forEach((column, colIndex) => {
        const cell = row.cells ? row.cells[column] : null;
        const mappedColumn = columnMap.get(column) || column;
        
        // Always set a value for each column, even if cell is null/undefined
        // This ensures we don't skip any cells in the display
        if (cell) {
          // For display, use the source value by default
          rowData.set(mappedColumn, cell.sourceValue);
          
          // Store the status for highlighting
          const key = `${rowIndex}-${mappedColumn}`;
          diffStatusMap.set(key, cell.status || 'match');
          
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
          
          if (cell.sourceValue !== undefined && cell.sourceValue !== null) {
            hasData = true;
          }
        } else {
          // If cell is null/undefined, set an empty value
          rowData.set(mappedColumn, null);
        }
      });
      
      // Log if we found a row with no data
      if (!hasData) {
        console.log(`Row ${i} (index ${rowIndex}) has no data`);
      }
    }
    
    console.log(`Processed ${rowMap.size} data rows`);
    
    // Convert to array format for template
    const sortedRows = Array.from(rowMap.entries()).sort((a, b) => a[0] - b[0]);
    
    console.log(`Converting ${sortedRows.length} rows to array format`);
    
    sortedRows.forEach(([rowIndex, rowData]) => {
      const rowArray = [rowIndex + 1]; // Add row number (1-based)
      
      actualColumns.forEach(column => {
        rowArray.push(rowData.get(column));
      });
      
      result.rows.push(rowArray);
    });
    
    console.log(`Final result has ${result.rows.length} rows`);
    
    // Check if we have the expected number of rows
    const expectedRows = this.rows.length - dataStartIndex;
    if (result.rows.length < expectedRows) {
      console.warn(`Missing rows! Expected ${expectedRows}, got ${result.rows.length}`);
      
        // Add empty rows to match the expected count
      for (let i = result.rows.length; i < expectedRows; i++) {
        const emptyRow = [i + 1]; // Row number (1-based)
        actualColumns.forEach(() => emptyRow.push(0)); // Use 0 for empty values to avoid type errors
        result.rows.push(emptyRow);
      }
      
      console.log(`Added ${expectedRows - result.rows.length} empty rows to match expected count`);
    }
    
    result.diffMap = diffStatusMap;
    result.diffValueMap = diffValueMap;
    result.changedValuesCount = changedValuesCount;
    result.removedValuesCount = removedValuesCount;
    
    // Make sure filteredRows is updated with all rows
    this.filteredRows = [...result.rows];
    
    return result;
  }
  
  transformXmlForDisplay(): ProcessedRow[] {
    const result: ProcessedRow[] = [];
    
    if (!this.rows || !this.columns) {
      console.warn('No XML data to transform');
      return result;
    }
    
    console.log('Processing XML comparison data with rows:', this.rows.length);
    
    // Create a map to store unique paths and their values
    const pathMap = new Map<string, ProcessedRow>();
    // Store original order of paths as they appear in source
    const pathOrder: string[] = [];
    
    // First pass: collect all unique paths and their values from all rows
    this.rows.forEach(row => {
      // For XML, each row.cells object contains a single path key
      // which contains the comparison info for that XML node
      Object.entries(row.cells || {}).forEach(([column, cell]: [string, any]) => {
        if (cell) {
          // If path not already tracked in order, add it
          if (!pathOrder.includes(column)) {
            pathOrder.push(column);
          }
          
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
          
          // Always update the path map with latest values
          pathMap.set(column, {
            path: column,
            sourceValue: cell.sourceValue !== undefined ? cell.sourceValue : null,
            targetValue: cell.targetValue !== undefined ? cell.targetValue : null,
            status: status
          });
        }
      });
    });
    
    console.log(`Found ${pathOrder.length} unique XML paths`);
    
    // Use the original path order from source file instead of sorting alphabetically
    pathOrder.forEach(path => {
      const row = pathMap.get(path);
      // Show all nodes in XML comparison, even matching ones
      if (row) {
        result.push(row);
      }
    });
    
    console.log(`Transformed XML data has ${result.length} rows`);
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
  
  getCellClass(rowIndex: number | string, column: string): string {
    if (!column) return '';
    
    // Ensure rowIndex is a number for key generation
    const numericRowIndex = typeof rowIndex === 'string' ? parseInt(rowIndex, 10) : rowIndex;
    
    const key = `${numericRowIndex}-${column}`;
    const status = this.tableData.diffMap?.get(key);
    
    if (!status) return '';
    
    let classNames = '';
    
    // Add status-based class
    switch (status) {
      case 'match':
        // For CSV/XLSX files, don't apply the orange match-value styling
        // Only apply match-value class for XML files
        if (this.fileType === 'xml') {
          classNames = 'match-value';
        }
        break;
      case 'different':
        // Check if we have both source and target values
        const sourceKey = `${numericRowIndex}-${column}-source`;
        const targetKey = `${numericRowIndex}-${column}-target`;
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
    const contentClass = this.getCellContentClass(numericRowIndex, column);
    if (contentClass) {
      classNames += ' ' + contentClass;
    }
    
    return classNames;
  }
  
  // This function no longer removes array indices
  cleanNodePath(path: string): string {
    if (!path) return path;
    return path; // Return path unchanged to preserve array indices
  }
  
  getCellContentClass(rowIndex: number | string, column: string): string {
    try {
      // Ensure rowIndex is a number
      const numericRowIndex = typeof rowIndex === 'string' ? parseInt(rowIndex, 10) : rowIndex;
      
      // Get the cell value
      const row = this.filteredRows[numericRowIndex];
      if (!row) return '';
      
      const colIndex = this.tableData.headers.indexOf(column);
      if (colIndex < 0) return '';
      
      // Handle the case where colIndex is a string
      const numericColIndex = typeof colIndex === 'string' ? parseInt(colIndex, 10) : colIndex;
      const value = row[numericColIndex];
      
      // Ensure we're working with a valid value
      if (value === null || value === undefined || value === '') return '';
      
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
    } catch (error) {
      console.error('Error in getCellContentClass:', error);
      return '';
    }
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
