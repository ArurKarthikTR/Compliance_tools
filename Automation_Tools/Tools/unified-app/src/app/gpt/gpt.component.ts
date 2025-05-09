import { Component, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GptService } from './gpt.service';

interface ChatMessage {
  sender: 'user' | 'system';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-gpt',
  templateUrl: './gpt.component.html',
  styleUrls: ['./gpt.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class GptComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatHistory') private chatHistoryElement!: ElementRef;
  @ViewChild('inputElement') private inputElement!: ElementRef;

  chatMessages: ChatMessage[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  shouldScrollToBottom: boolean = false;

  complianceResponses: { [key: string]: string } = {
    'gdpr': 'The General Data Protection Regulation (GDPR) is a regulation in EU law on data protection and privacy...',
    'hipaa': 'The Health Insurance Portability and Accountability Act (HIPAA) establishes standards for protecting sensitive patient data...',
    'pci dss': 'The Payment Card Industry Data Security Standard (PCI DSS) is a set of security standards for organizations that handle credit cards...',
    'iso 27001': 'ISO 27001 is an international standard for information security management...'
  };

  constructor(private gptService: GptService) {}

  ngOnInit(): void {
    this.chatMessages.push({
      sender: 'system',
      content: 'Hello! I\'m your Compliance Assistant. Ask me about GDPR, HIPAA, PCI DSS, or ISO 27001.',
      timestamp: new Date()
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  sendMessage(): void {
    if (!this.userInput.trim()) return;

    this.chatMessages.push({
      sender: 'user',
      content: this.userInput,
      timestamp: new Date()
    });

    const userQuestion = this.userInput.toLowerCase();
    this.userInput = '';
    this.shouldScrollToBottom = true;
    this.isLoading = true;

    this.gptService.sendMessage(userQuestion).subscribe({
      next: (response) => {
        this.chatMessages.push({
          sender: 'system',
          content: response.response,
          timestamp: new Date()
        });
        this.isLoading = false;
        this.shouldScrollToBottom = true;
      },
      error: () => {
        this.chatMessages.push({
          sender: 'system',
          content: 'Sorry, I encountered an error processing your request. Please try again later.',
          timestamp: new Date()
        });
        this.isLoading = false;
        this.shouldScrollToBottom = true;
      }
    });
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  adjustTextareaHeight(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight > 200 ? 200 : textarea.scrollHeight) + 'px';
  }

  private scrollToBottom(): void {
    try {
      this.chatHistoryElement.nativeElement.scrollTop = 
        this.chatHistoryElement.nativeElement.scrollHeight;
    } catch (err) {}
  }
}
