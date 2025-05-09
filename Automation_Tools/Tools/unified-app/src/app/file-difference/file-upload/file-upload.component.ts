import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
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
export class FileUploadComponent implements OnInit {
  @Input() selectedFileType: string = '';
  @Output() comparisonResults = new EventEmitter<any>();
  @Output() loading = new EventEmitter<boolean>();
  @Output() error = new EventEmitter<string>();
  
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
  }
  
  onSourceFileChange(event: Event): void {
    this.sourceFileSelecting = false;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      this.sourceFile = file;
      this.sourceFileSize = this.formatFileSize(file.size);
      this.validateFiles();
      
      // If it's an Excel file, load preview
      if (this.getFileExtension(file.name) === '.xlsx') {
        this.loadFilePreview(file, 'source');
      } else {
        this.sourceFilePreviewData = null;
      }
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
      
      // If it's an Excel file, load preview
      if (this.getFileExtension(file.name) === '.xlsx') {
        this.loadFilePreview(file, 'target');
      } else {
        this.targetFilePreviewData = null;
      }
    }
  }
  
  loadFilePreview(file: File, fileType: 'source' | 'target'): void {
    const formData = new FormData();
    formData.append('file', file);
    
    this.http.post('http://localhost:5000/api/file-difference/preview', formData)
      .subscribe({
        next: (result: any) => {
          if (fileType === 'source') {
            this.sourceFilePreviewData = result;
          } else {
            this.targetFilePreviewData = result;
          }
        },
        error: (error) => {
          console.error(`Error loading ${fileType} file preview:`, error);
          // Don't show error to user, just log it
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
  
  resetForm(): void {
    this.sourceFile = null;
    this.targetFile = null;
    this.errorMessage = '';
    this.comparisonResults.emit(null);
  }
}
