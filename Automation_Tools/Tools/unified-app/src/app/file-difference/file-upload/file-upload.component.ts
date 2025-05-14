import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileDifferenceService } from '../../services/file-difference.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent implements OnInit, OnChanges {
  @Input() selectedFileType: string = '';
  @Input() inputSourceFile: File | null = null;
  @Input() inputTargetFile: File | null = null;
  @Input() inputSourceFileSize: string = '';
  @Input() inputTargetFileSize: string = '';
  @Input() inputSourceFilePreviewData: any = null;
  @Input() inputTargetFilePreviewData: any = null;
  @Input() inputSourceFileContent: string | null = null;
  @Input() inputTargetFileContent: string | null = null;
  @Output() comparisonResults = new EventEmitter<any>();
  @Output() loading = new EventEmitter<boolean>();
  @Output() error = new EventEmitter<string>();
  @Output() fileInfoUpdated = new EventEmitter<any>();
  
  sourceFile: File | null = null;
  targetFile: File | null = null;
  isLoading = false;
  errorMessage = '';
  
  // File selection states
  sourceFileSelecting = false;
  targetFileSelecting = false;
  
  // File size information
  sourceFileSize = '';
  targetFileSize = '';
  
  // File preview data
  sourceFilePreviewData: any = null;
  targetFilePreviewData: any = null;
  
  // XML file content for preview
  sourceFileContent: string | null = null;
  targetFileContent: string | null = null;
  
  allowedFileTypes = ['.csv', '.xml', '.xlsx'];
  fileTypeDescriptions = {
    '.csv': 'CSV (Comma Separated Values)',
    '.xml': 'XML (Extensible Markup Language)',
    '.xlsx': 'Excel Spreadsheet'
  };
  
  constructor(
    private fileDifferenceService: FileDifferenceService,
    private http: HttpClient
  ) {}
  
  ngOnInit(): void {
    // Initialize component
    if (this.selectedFileType) {
      console.log(`File type restricted to: ${this.selectedFileType}`);
    }
    
    // Apply input values if available
    this.initializeFromInputs();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    // Apply input values when they change
    if (changes['inputSourceFile'] || changes['inputTargetFile']) {
      this.initializeFromInputs();
    }
  }
  
  initializeFromInputs(): void {
    // Initialize from input properties if available
    if (this.inputSourceFile) {
      this.sourceFile = this.inputSourceFile;
      this.sourceFileSize = this.inputSourceFileSize || this.formatFileSize(this.sourceFile.size);
      this.sourceFilePreviewData = this.inputSourceFilePreviewData;
      this.sourceFileContent = this.inputSourceFileContent;
      
      // Validate after setting files
      this.validateFiles();
    }
    
    if (this.inputTargetFile) {
      this.targetFile = this.inputTargetFile;
      this.targetFileSize = this.inputTargetFileSize || this.formatFileSize(this.targetFile.size);
      this.targetFilePreviewData = this.inputTargetFilePreviewData;
      this.targetFileContent = this.inputTargetFileContent;
      
      // Validate after setting files
      this.validateFiles();
    }
  }
  
  onSourceFileChange(event: Event): void {
    this.sourceFileSelecting = false;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      this.sourceFile = file;
      this.sourceFileSize = this.formatFileSize(file.size);
      this.validateFiles();
      
      // Load preview for Excel and CSV files
      const fileExt = this.getFileExtension(file.name);
      if (fileExt === '.xlsx' || fileExt === '.csv') {
        this.loadFilePreview(file, 'source');
      } else if (fileExt === '.xml') {
        this.readXmlFile(file, 'source');
      } else {
        this.sourceFilePreviewData = null;
        this.sourceFileContent = null;
      }
      
      // Emit file info for all file types
      this.emitFileInfo();
    }
  }
  
  onTargetFileChange(event: Event): void {
    this.targetFileSelecting = false;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      this.targetFile = file;
      this.targetFileSize = this.formatFileSize(file.size);
      this.validateFiles();
      
      // Load preview for Excel and CSV files
      const fileExt = this.getFileExtension(file.name);
      if (fileExt === '.xlsx' || fileExt === '.csv') {
        this.loadFilePreview(file, 'target');
      } else if (fileExt === '.xml') {
        this.readXmlFile(file, 'target');
      } else {
        this.targetFilePreviewData = null;
        this.targetFileContent = null;
      }
      
      // Emit file info for all file types
      this.emitFileInfo();
    }
  }
  
  loadFilePreview(file: File, fileType: 'source' | 'target'): void {
    const formData = new FormData();
    formData.append('file', file);
    
    console.log(`Loading preview for ${fileType} file: ${file.name}`);
    
    // Show loading indicator or placeholder while waiting for preview
    if (fileType === 'source') {
      this.sourceFilePreviewData = { loading: true, columns: ['Loading...'], rows: [] };
    } else {
      this.targetFilePreviewData = { loading: true, columns: ['Loading...'], rows: [] };
    }
    
    this.http.post('http://localhost:5000/api/file-difference/preview', formData)
      .subscribe({
        next: (result: any) => {
          console.log(`Preview data received for ${fileType} file:`, result);
          
          if (fileType === 'source') {
            this.sourceFilePreviewData = result;
            console.log('Source file preview data set:', this.sourceFilePreviewData);
          } else {
            this.targetFilePreviewData = result;
            console.log('Target file preview data set:', this.targetFilePreviewData);
          }
          
          // Emit file information when preview is loaded
          this.emitFileInfo();
        },
        error: (error) => {
          console.error(`Error loading ${fileType} file preview:`, error);
          
          // Set a basic preview data structure even if preview fails
          if (fileType === 'source') {
            this.sourceFilePreviewData = { 
              error: true, 
              columns: ['Preview not available'], 
              rows: [{ 'Preview not available': 'Could not load preview data' }] 
            };
          } else {
            this.targetFilePreviewData = { 
              error: true, 
              columns: ['Preview not available'], 
              rows: [{ 'Preview not available': 'Could not load preview data' }] 
            };
          }
          
          // Still emit file info to ensure files are tracked
          this.emitFileInfo();
        }
      });
  }
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  onSourceFileSelect(): void {
    this.sourceFileSelecting = true;
  }
  
  onTargetFileSelect(): void {
    this.targetFileSelecting = true;
  }
  
  validateFiles(): void {
    this.errorMessage = '';
    
    if (!this.sourceFile || !this.targetFile) {
      return;
    }
    
    // Check if files are of allowed types
    const sourceExt = this.getFileExtension(this.sourceFile.name);
    const targetExt = this.getFileExtension(this.targetFile.name);
    
    // If a specific file type is selected, enforce it
    if (this.selectedFileType) {
      const expectedExt = '.' + this.selectedFileType;
      if (sourceExt !== expectedExt || targetExt !== expectedExt) {
        this.errorMessage = `Only ${this.fileTypeDescriptions[expectedExt as keyof typeof this.fileTypeDescriptions]} files are allowed for this comparison.`;
        return;
      }
    } else if (!this.allowedFileTypes.includes(sourceExt) || !this.allowedFileTypes.includes(targetExt)) {
      this.errorMessage = 'Unsupported file type. Please upload CSV, XML, or XLSX files.';
      return;
    }
    
    // Check if files are of the same type
    if (sourceExt !== targetExt) {
      this.errorMessage = 'Files are of different types. Please upload files of the same format.';
      return;
    }
  }
  
  getFileExtension(filename: string): string {
    return '.' + filename.split('.').pop()?.toLowerCase() || '';
  }
  
  getFileTypeDescription(extension: string): string {
    return this.fileTypeDescriptions[extension as keyof typeof this.fileTypeDescriptions] || extension;
  }
  
  compareFiles(): void {
    if (!this.sourceFile || !this.targetFile) {
      this.errorMessage = 'Please select both source and target files.';
      return;
    }
    
    if (this.errorMessage) {
      return;
    }
    
    this.isLoading = true;
    this.loading.emit(true);
    this.errorMessage = '';
    
    console.log('Comparing files:', this.sourceFile.name, this.targetFile.name);
    
    this.fileDifferenceService.compareFiles(this.sourceFile, this.targetFile)
      .subscribe({
        next: (result) => {
          console.log('Comparison result received:', result);
          this.isLoading = false;
          this.loading.emit(false);
          this.comparisonResults.emit(result);
        },
        error: (error) => {
          console.error('Error during comparison:', error);
          this.isLoading = false;
          this.loading.emit(false);
          if (error.error && typeof error.error === 'object') {
            this.errorMessage = error.error.error || 'An error occurred during comparison. Please try again.';
          } else if (error.message) {
            this.errorMessage = error.message;
          } else {
            this.errorMessage = 'An error occurred during comparison. Please try again.';
          }
          this.error.emit(this.errorMessage);
        }
      });
  }
  
  // Read XML file content for preview
  readXmlFile(file: File, fileType: 'source' | 'target'): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const content = e.target.result;
      if (fileType === 'source') {
        this.sourceFileContent = content;
      } else {
        this.targetFileContent = content;
      }
      
      // Emit file information when XML content is loaded
      this.emitFileInfo();
    };
    reader.readAsText(file);
  }
  
  emitFileInfo(): void {
    // Only emit when we have at least one file
    if (this.sourceFile || this.targetFile) {
      const fileInfo = {
        sourceFile: this.sourceFile,
        targetFile: this.targetFile,
        sourceFileSize: this.sourceFileSize,
        targetFileSize: this.targetFileSize,
        sourceFilePreviewData: this.sourceFilePreviewData,
        targetFilePreviewData: this.targetFilePreviewData,
        sourceFileContent: this.sourceFileContent,
        targetFileContent: this.targetFileContent
      };
      console.log('Emitting file information:', fileInfo);
      
      // Log whether XML content is included in the emitted info
      if (this.sourceFileContent || this.targetFileContent) {
        console.log('XML content included in emitted file info');
      }
      
      this.fileInfoUpdated.emit(fileInfo);
    }
  }
  
  resetForm(): void {
    this.sourceFile = null;
    this.targetFile = null;
    this.errorMessage = '';
    this.sourceFileContent = null;
    this.targetFileContent = null;
    this.sourceFilePreviewData = null;
    this.targetFilePreviewData = null;
    this.comparisonResults.emit(null);
  }
}
