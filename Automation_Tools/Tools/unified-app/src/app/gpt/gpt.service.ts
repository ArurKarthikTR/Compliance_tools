import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GptService {
  private apiUrl = 'http://localhost:5000/api/chat';

  constructor(private http: HttpClient) { }

  /**
   * Send a message to the Python backend and get a response
   * @param message The user's message
   */
  sendMessage(message: string): Observable<any> {
    return this.http.post<any>(this.apiUrl, { message });
  }
}