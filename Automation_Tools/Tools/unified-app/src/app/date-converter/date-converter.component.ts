import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DateConverterService } from '../services/date-converter.service';

@Component({
  selector: 'app-date-converter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './date-converter.component.html',
  styleUrl: './date-converter.component.scss'
})
export class DateConverterComponent {
  selectedFile: File | null = null;
  newDate: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private dateConverterService: DateConverterService) {}

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files.length > 0) {
      this.selectedFile = files[0];
    }
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a file';
      return;
    }

    if (!this.newDate) {
      this.errorMessage = 'Please enter a date';
      return;
    }

    // Validate date format (dd-mm-yyyy)
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (!dateRegex.test(this.newDate)) {
      this.errorMessage = 'Please enter a valid date in dd-mm-yyyy format';
      return;
    }

    this.isLoading = true;
    
    this.dateConverterService.updateDates(this.selectedFile, this.newDate)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = 'File processed successfully';
          
          // Create a download link for the processed file
          const url = window.URL.createObjectURL(response);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${this.newDate}-AL_STATE.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.error || 'An error occurred while processing the file';
        }
      });
  }
}
