import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DateConverterService {
  private apiUrl = 'http://localhost:5000/api/date-converter';

  constructor(private http: HttpClient) { }

  /**
   * Upload a CSV file and update dates to the specified format
   * @param file The CSV file to process
   * @param date The new date format (dd-mm-yyyy)
   * @returns Observable with the processed file
   */
  updateDates(file: File, date: string): Observable<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('date', date);

    return this.http.post(`${this.apiUrl}/update`, formData, {
      responseType: 'blob'
    });
  }
}
