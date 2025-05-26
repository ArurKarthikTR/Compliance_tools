import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FieldConfig {
  id: string;
  name: string;
  type: string;
  options?: any;
  unique?: boolean;
}

export interface GenerateDataRequest {
  fields: FieldConfig[];
  rowCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class TestDataGeneratorService {
  private apiUrl = 'http://localhost:5000/api/test-generator';

  constructor(private http: HttpClient) { }

  /**
   * Generate preview data based on field configuration
   * @param request The data generation request
   * @returns Observable with the generated data
   */
  generateData(request: GenerateDataRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate`, request);
  }

  /**
   * Download generated data as CSV
   * @param request The data generation request
   * @returns Observable with the CSV file
   */
  downloadCsv(request: GenerateDataRequest): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/download/csv`, request, {
      responseType: 'blob'
    });
  }

  /**
   * Download generated data as JSON
   * @param request The data generation request
   * @returns Observable with the JSON file
   */
  downloadJson(request: GenerateDataRequest): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/download/json`, request, {
      responseType: 'blob'
    });
  }

  /**
   * Download generated data as Excel
   * @param request The data generation request
   * @returns Observable with the Excel file
   */
  downloadExcel(request: GenerateDataRequest): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/download/excel`, request, {
      responseType: 'blob'
    });
  }

  /**
   * Download generated data as XML
   * @param request The data generation request
   * @returns Observable with the XML file
   */
  downloadXml(request: GenerateDataRequest): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/download-xml`, request, {
      responseType: 'blob'
    });
  }
  
  /**
   * Import a CSV or Excel file and extract field configurations
   * @param file The file to import
   * @returns Observable with the extracted field configurations
   */
  importFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post(`${this.apiUrl}/import`, formData);
  }
}
