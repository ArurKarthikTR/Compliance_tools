import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { TestDataGeneratorService, FieldConfig, GenerateDataRequest } from '../services/test-data-generator.service';

interface FieldType {
  value: string;
  label: string;
  hasOptions: boolean;
  optionsConfig?: any;
}

@Component({
  selector: 'app-test-data-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './test-data-generator.component.html',
  styleUrl: './test-data-generator.component.scss'
})
export class TestDataGeneratorComponent implements OnInit {
  configForm!: FormGroup;
  previewData: any[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
  fieldTypes: FieldType[] = [
    { value: 'Name', label: 'Full Name', hasOptions: false },
    { value: 'FirstName', label: 'First Name', hasOptions: false },
    { value: 'LastName', label: 'Last Name', hasOptions: false },
    { value: 'Email', label: 'Email Address', hasOptions: false },
    { value: 'Phone', label: 'Phone Number', hasOptions: false },
    { value: 'Address', label: 'Address', hasOptions: false },
    { value: 'City', label: 'City', hasOptions: false },
    { value: 'Country', label: 'Country', hasOptions: false },
    { value: 'PostalCode', label: 'Postal Code', hasOptions: false },
    { value: 'Company', label: 'Company Name', hasOptions: false },
    { value: 'JobTitle', label: 'Job Title', hasOptions: false },
    { value: 'String', label: 'Text String', hasOptions: true, optionsConfig: { minLength: 5, maxLength: 20 } },
    { value: 'Number', label: 'Number', hasOptions: true, optionsConfig: { min: 0, max: 100, precision: 0 } },
    { value: 'Decimal', label: 'Decimal', hasOptions: true, optionsConfig: { min: 0, max: 100, precision: 2 } },
    { value: 'Boolean', label: 'Boolean', hasOptions: false },
    { value: 'Date', label: 'Date', hasOptions: true, optionsConfig: { format: 'YYYY-MM-DD' } },
    { value: 'CustomText', label: 'Custom Text', hasOptions: true, optionsConfig: { pattern: '', values: [] } }
  ];

  constructor(
    private fb: FormBuilder,
    private testDataGeneratorService: TestDataGeneratorService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.configForm = this.fb.group({
      rowCount: [100, [Validators.required, Validators.min(1), Validators.max(1000)]],
      fields: this.fb.array([])
    });

    // Add a default field
    this.addField();
  }

  get fields(): FormArray {
    return this.configForm.get('fields') as FormArray;
  }

  addField(): void {
    const fieldGroup = this.fb.group({
      id: [this.generateId()],
      name: ['', Validators.required],
      type: ['Name', Validators.required],
      options: this.fb.group({}),
      unique: [false]
    });

    this.fields.push(fieldGroup);
    this.updateFieldOptions(this.fields.length - 1);
  }

  removeField(index: number): void {
    this.fields.removeAt(index);
  }

  updateFieldOptions(index: number): void {
    const fieldGroup = this.fields.at(index) as FormGroup;
    const fieldType = fieldGroup.get('type')?.value;
    const selectedType = this.fieldTypes.find(type => type.value === fieldType);
    
    if (selectedType && selectedType.hasOptions) {
      const optionsConfig = { ...selectedType.optionsConfig };
      fieldGroup.setControl('options', this.fb.group(optionsConfig));
    } else {
      fieldGroup.setControl('options', this.fb.group({}));
    }
  }

  onFieldTypeChange(index: number): void {
    this.updateFieldOptions(index);
  }

  generatePreview(): void {
    if (this.configForm.invalid) {
      this.errorMessage = 'Please fix the form errors before generating data';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    const request: GenerateDataRequest = this.configForm.value;
    
    this.testDataGeneratorService.generateData(request)
      .subscribe({
        next: (data) => {
          this.isLoading = false;
          this.previewData = data;
          this.successMessage = `Generated ${data.length} rows of data`;
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.error || 'An error occurred while generating data';
        }
      });
  }

  downloadData(format: 'csv' | 'json' | 'excel'): void {
    if (this.configForm.invalid) {
      this.errorMessage = 'Please fix the form errors before downloading data';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    
    const request: GenerateDataRequest = this.configForm.value;
    let downloadObservable;
    let fileExtension;
    
    switch (format) {
      case 'csv':
        downloadObservable = this.testDataGeneratorService.downloadCsv(request);
        fileExtension = 'csv';
        break;
      case 'json':
        downloadObservable = this.testDataGeneratorService.downloadJson(request);
        fileExtension = 'json';
        break;
      case 'excel':
        downloadObservable = this.testDataGeneratorService.downloadExcel(request);
        fileExtension = 'xlsx';
        break;
    }
    
    downloadObservable.subscribe({
      next: (response) => {
        this.isLoading = false;
        
        // Create a download link
        const url = window.URL.createObjectURL(response);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `test-data-${timestamp}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        this.successMessage = `Downloaded data in ${format.toUpperCase()} format`;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.error || `An error occurred while downloading ${format.toUpperCase()} data`;
      }
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }
}
