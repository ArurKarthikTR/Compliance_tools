import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileDifferenceService } from '../../services/file-difference.service';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent {
  @Output() comparisonResults = new EventEmitter<any>();
  @Output() loading = new EventEmitter<boolean>();
  @Output() error = new EventEmitter<string>();
  
  sourceFile: File | null = null;
  targetFile: File | null = null;
  isLoading = false;
  errorMessage = '';
  
  allowedFileTypes = ['.csv', '.xml', '.xlsx'];
  
  constructor(private fileDifferenceService: FileDifferenceService) {}
  
  onSourceFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.sourceFile = input.files[0];
      this.validateFiles();
    }
  }
  
  onTargetFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.targetFile = input.files[0];
      this.validateFiles();
    }
  }
  
  validateFiles(): void {
    this.errorMessage = '';
    
    if (!this.sourceFile || !this.targetFile) {
      return;
    }
    
    // Check if files are of allowed types
    const sourceExt = this.getFileExtension(this.sourceFile.name);
    const targetExt = this.getFileExtension(this.targetFile.name);
    
    if (!this.allowedFileTypes.includes(sourceExt) || !this.allowedFileTypes.includes(targetExt)) {
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
