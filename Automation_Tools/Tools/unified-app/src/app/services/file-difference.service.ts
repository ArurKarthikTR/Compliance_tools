import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FileDifferenceService {
  private apiUrl = 'http://localhost:5000/api/file-difference';

  constructor(private http: HttpClient) { }

  /**
   * Upload two files and compare them
   * @param sourceFile The source file
   * @param targetFile The target file
   * @returns Observable with the comparison results
   */
  compareFiles(sourceFile: File, targetFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('sourceFile', sourceFile);
    formData.append('targetFile', targetFile);

    console.log('Sending files for comparison:', sourceFile.name, targetFile.name);
    
    return this.http.post(`${this.apiUrl}/upload`, formData)
      .pipe(
        tap(response => {
          console.log('Received comparison response:', response);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get a preview of a file (first 10 rows for Excel files)
   * @param file The file to preview
   * @returns Observable with the preview data
   */
  previewFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('Sending file for preview:', file.name);
    
    return this.http.post(`${this.apiUrl}/preview`, formData)
      .pipe(
        tap(response => {
          console.log('Received preview response:', response);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Check if the backend service is healthy
   * @returns Observable with the health status
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }

  /**
   * Handle HTTP errors
   * @param error The HTTP error response
   * @returns An observable with the error message
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error && error.error.error) {
        errorMessage = error.error.error;
      } else {
        errorMessage = `Error Code: ${error.status}, Message: ${error.message}`;
      }
    }
    
    console.error('API Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
