import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FileUploadComponent } from './file-upload/file-upload.component';
import { ComparisonResultsComponent } from './comparison-results/comparison-results.component';
import { FileDifferenceService } from '../services/file-difference.service';

@Component({
  selector: 'app-file-difference',
  standalone: true,
  imports: [CommonModule, FileUploadComponent, ComparisonResultsComponent],
  templateUrl: './file-difference.component.html',
  styleUrls: ['./file-difference.component.scss']
})
export class FileDifferenceComponent {
  comparisonData: any = null;
  isLoading: boolean = false;
  errorMessage: string = '';
  selectedFileType: string = ''; // Will be set based on route or user selection
  
  // Store uploaded file information
  sourceFile: File | null = null;
  targetFile: File | null = null;
  sourceFileSize: string = '';
  targetFileSize: string = '';
  sourceFilePreviewData: any = null;
  targetFilePreviewData: any = null;
  sourceFileContent: string | null = null;
  targetFileContent: string | null = null;

  constructor(
    private fileDifferenceService: FileDifferenceService,
    private route: ActivatedRoute
  ) {
    console.log('FileDifferenceComponent initialized');
    
    // Get file type from route data if available
    this.route.data.subscribe(data => {
      if (data['fileType']) {
        this.selectedFileType = data['fileType'];
        console.log(`File type set from route: ${this.selectedFileType}`);
      }
    });
  }

  handleComparisonResults(results: any): void {
    console.log('FileDifferenceComponent received comparison results:', results);
    this.comparisonData = results;
    
    // Check if the results are valid
    if (results) {
      console.log('Results fileType:', results.fileType);
      console.log('Results columns:', results.columns?.length);
      console.log('Results rows:', results.rows?.length);
    } else {
      console.warn('Received null or undefined results');
    }
  }
  
  storeFileInformation(fileInfo: any): void {
    console.log('Storing file information:', fileInfo);
    
    // Store all the file information
    this.sourceFile = fileInfo.sourceFile;
    this.targetFile = fileInfo.targetFile;
    this.sourceFileSize = fileInfo.sourceFileSize;
    this.targetFileSize = fileInfo.targetFileSize;
    this.sourceFilePreviewData = fileInfo.sourceFilePreviewData;
    this.targetFilePreviewData = fileInfo.targetFilePreviewData;
    this.sourceFileContent = fileInfo.sourceFileContent;
    this.targetFileContent = fileInfo.targetFileContent;
    
    // Log XML content presence for debugging
    if (this.sourceFileContent) {
      console.log('Source XML content stored, length:', this.sourceFileContent.length);
    }
    if (this.targetFileContent) {
      console.log('Target XML content stored, length:', this.targetFileContent.length);
    }
  }

  handleLoading(loading: boolean): void {
    console.log('FileDifferenceComponent loading state changed:', loading);
    this.isLoading = loading;
  }

  handleError(error: string): void {
    console.error('FileDifferenceComponent received error:', error);
    this.errorMessage = error;
  }

  resetView(): void {
    console.log('FileDifferenceComponent resetting view');
    this.comparisonData = null;
    this.errorMessage = '';
    // File information is preserved for the file-upload component
  }
}
