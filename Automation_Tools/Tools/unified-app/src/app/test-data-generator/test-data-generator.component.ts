import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { TestDataGeneratorService, FieldConfig, GenerateDataRequest } from '../services/test-data-generator.service';
import { HttpClient } from '@angular/common/http';

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
    { value: 'String', label: 'String', hasOptions: true, optionsConfig: { minLength: 5, maxLength: 20 } },
    { value: 'Number', label: 'Number', hasOptions: true, optionsConfig: { min: 0, max: 100, length: 5 } },
    { value: 'Boolean', label: 'Boolean', hasOptions: false },
    { value: 'Date', label: 'Date', hasOptions: true, optionsConfig: { startDate: '2020-01-01', endDate: '2025-12-31' } },
    { value: 'Float', label: 'Float', hasOptions: true, optionsConfig: { min: 0, max: 100, precision: 2 } },
    { value: 'Decimal', label: 'Decimal', hasOptions: true, optionsConfig: { min: 0, max: 100, precision: 2 } },
    { value: 'Constant', label: 'Constant', hasOptions: true, optionsConfig: { value: '10' } }
  ];

  showFieldForm: boolean = false;
  showImportForm: boolean = false;
  isEditMode: boolean = false;
  editingFieldIndex: number = -1;
  newField: FieldConfig = {
    id: '',
    name: '',
    type: 'String',
    unique: false,
    options: {}
  };
  
  // Import related properties
  selectedFile: File | null = null;
  isImporting: boolean = false;
  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private testDataGeneratorService: TestDataGeneratorService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.configForm = this.fb.group({
      rowCount: [10, [Validators.required, Validators.min(1), Validators.max(1000)]],
      fields: this.fb.array([])
    });
  }

  get fields(): FormArray {
    return this.configForm.get('fields') as FormArray;
  }

  // Initialize new field when showFieldForm becomes true
  ngDoCheck(): void {
    if (this.showFieldForm && !this.newField.id) {
      this.newField = {
        id: this.generateId(),
        name: '',
        type: 'String',
        unique: false,
        options: { minLength: 5, maxLength: 20 }
      };
    }
  }

  updateNewFieldOptions(): void {
    const selectedType = this.fieldTypes.find(type => type.value === this.newField.type);

    if (selectedType && selectedType.hasOptions) {
      this.newField.options = { ...selectedType.optionsConfig };
    } else {
      this.newField.options = {};
    }
    
    // For Constant type, always set uniqueness to false (duplicate values)
    if (this.newField.type === 'Constant') {
      this.newField.unique = false;
    }
  }

  cancelAddField(): void {
    this.showFieldForm = false;
    this.isEditMode = false;
    this.editingFieldIndex = -1;
  }

  saveNewField(): void {
    if (!this.newField.name) {
      this.errorMessage = 'Column name is required';
      return;
    }

    const fieldGroup = this.fb.group({
      id: [this.newField.id],
      name: [this.newField.name, Validators.required],
      type: [this.newField.type, Validators.required],
      options: this.fb.group(this.newField.options || {}),
      unique: [this.newField.unique]
    });

    if (this.isEditMode && this.editingFieldIndex >= 0) {
      // Update existing field
      this.fields.setControl(this.editingFieldIndex, fieldGroup);
    } else {
      // Add new field
      this.fields.push(fieldGroup);
    }

    this.showFieldForm = false;
    this.isEditMode = false;
    this.editingFieldIndex = -1;
    this.errorMessage = '';

    // Reset the new field for next use
    this.newField = {
      id: this.generateId(),
      name: '',
      type: 'String',
      unique: false,
      options: { minLength: 5, maxLength: 20 }
    };
  }

  removeField(index: number): void {
    this.fields.removeAt(index);
  }

  duplicateField(index: number): void {
    const originalField = this.fields.at(index) as FormGroup;
    const fieldCopy = this.fb.group({
      id: [this.generateId()],
      name: [originalField.get('name')?.value, Validators.required],
      type: [originalField.get('type')?.value, Validators.required],
      options: this.fb.group(originalField.get('options')?.value || {}),
      unique: [originalField.get('unique')?.value]
    });

    this.fields.push(fieldCopy);
  }

  editField(index: number): void {
    const fieldGroup = this.fields.at(index) as FormGroup;

    // Set edit mode
    this.isEditMode = true;
    this.editingFieldIndex = index;

    // Populate the form with the field's current values
    this.newField = {
      id: fieldGroup.get('id')?.value,
      name: fieldGroup.get('name')?.value,
      type: fieldGroup.get('type')?.value,
      unique: fieldGroup.get('unique')?.value,
      options: fieldGroup.get('options')?.value || {}
    };

    // Show the form
    this.showFieldForm = true;
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

  getFieldTypeLabel(typeValue: string): string {
    const fieldType = this.fieldTypes.find(type => type.value === typeValue);
    return fieldType ? fieldType.label : 'String';
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

  downloadData(format: 'csv' | 'json' | 'xml' | 'excel'): void {
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
      case 'xml':
        downloadObservable = this.testDataGeneratorService.downloadXml(request);
        fileExtension = 'xml';
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
  
  // File import methods
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.importFile();
    }
  }
  
  cancelImport(): void {
    this.showImportForm = false;
    this.selectedFile = null;
    this.isImporting = false;
  }
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  importFile(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a file to import';
      return;
    }
    
    this.isImporting = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    // Store the file name before it gets reset
    const fileName = this.selectedFile.name;
    
    // Call the backend API to process the file
    this.testDataGeneratorService.importFile(this.selectedFile)
      .subscribe({
        next: (response: any) => {
          this.isImporting = false;
          
          if (response && response.fields) {
            // Clear existing fields before adding new ones
            while (this.fields.length > 0) {
              this.fields.removeAt(0);
            }
            
            // Add imported fields to the form
            this.addImportedFields(response.fields);
            this.selectedFile = null;
            this.successMessage = `Successfully imported ${response.fields.length} fields from ${fileName}`;
          } else {
            this.errorMessage = 'No fields found in the imported file';
          }
        },
        error: (error: any) => {
          this.isImporting = false;
          this.errorMessage = error.error?.error || 'An error occurred while importing the file';
        }
      });
  }
  
  addImportedFields(importedFields: any[]): void {
    // Convert imported fields to the format expected by the form
    importedFields.forEach(field => {
      const fieldConfig: FieldConfig = {
        id: this.generateId(),
        name: field.name,
        type: field.type,
        unique: field.unique !== undefined ? field.unique : false, // Use provided value or default to false
        options: field.options || {}
      };
      
      // Create form group for the field
      const fieldGroup = this.fb.group({
        id: [fieldConfig.id],
        name: [fieldConfig.name, Validators.required],
        type: [fieldConfig.type, Validators.required],
        options: this.fb.group(fieldConfig.options || {}),
        unique: [fieldConfig.unique]
      });
      
      // Add to fields array
      this.fields.push(fieldGroup);
    });
  }
}
